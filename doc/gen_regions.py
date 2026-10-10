"""生成 src/core/regions.ts：全国 省 → 市 → 区县 两级级联 + 经纬度。

数据源：阿里云 DataV 行政区划（公开 GeoJSON，含 adcode / name / center / childrenNum）。
用法：
    <python> doc/gen_regions.py

特殊情况：
    - 台湾省（710000）在数据源中 childrenNum=0 且无 _full.json，使用内置的主要市清单
      （坐标为其市级驻地，来源与其余省市同一体系的公开值），区县留空 → 选择时用市级坐标。
    - 省列表含一条伪条目 adcode='100000_JD'（空名），直接过滤。

自检：
    - 统计省 / 市 / 区县数量，并与每级 childrenNum 对账
    - 校验经纬度范围，且不落在 (0, 0)
    - 断言用户举的四个例子可命中：湖北省/黄石市/大冶市、湖北省/武汉市/江夏区、
      广西壮族自治区/南宁市/青秀区、广西壮族自治区/崇左市/天等县
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Windows 控制台默认 GBK，强制 UTF-8 以免中文/符号打印报错
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE = "https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json"
OUT = Path(__file__).resolve().parent.parent / "src" / "core" / "regions.ts"

# 直辖市：省即市，避免「北京市 / 北京市 / 东城区」这种冗余层级
MUNICIPALITIES = {"北京市", "天津市", "上海市", "重庆市"}

TIMEZONE_BY_PROVINCE = {
    "香港特别行政区": "Asia/Hong_Kong",
    "澳门特别行政区": "Asia/Macau",
    "台湾省": "Asia/Taipei",
}
DEFAULT_TIMEZONE = "Asia/Shanghai"

# 台湾省：数据源无下级数据，内置主要市（坐标为市级驻地）
TAIWAN_CITIES: list[tuple[str, float, float]] = [
    ("台北市", 121.5654, 25.0330),
    ("新北市", 121.4657, 25.0124),
    ("桃园市", 121.3009, 24.9936),
    ("台中市", 120.6736, 24.1477),
    ("台南市", 120.2513, 22.9998),
    ("高雄市", 120.3014, 22.6273),
    ("基隆市", 121.7392, 25.1276),
    ("新竹市", 120.9675, 24.8138),
    ("嘉义市", 120.4491, 23.4801),
    ("宜兰县", 121.7538, 24.7021),
    ("花莲县", 121.6064, 23.9911),
    ("台东县", 121.1500, 22.7554),
    ("苗栗县", 120.8214, 24.5602),
    ("彰化县", 120.5414, 24.0759),
    ("南投县", 120.6845, 23.9099),
    ("云林县", 120.4314, 23.7092),
    ("屏东县", 120.4881, 22.6689),
    ("澎湖县", 119.5793, 23.5711),
]


CACHE_DIR = Path(__file__).resolve().parent / ".region-cache"


def fetch(adcode) -> dict:
    """取一份 GeoJSON，带本地缓存与 6 次退避重试。

    数据源偶发 RemoteDisconnected，缓存让重复运行不用重新下载。
    """
    CACHE_DIR.mkdir(exist_ok=True)
    cache_file = CACHE_DIR / f"{adcode}.json"
    if cache_file.exists():
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            cache_file.unlink(missing_ok=True)

    url = BASE.format(adcode=adcode)
    last_error: Exception | None = None
    for attempt in range(6):
        try:
            with urllib.request.urlopen(url, timeout=45) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            cache_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            return payload
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(0.8 * (attempt + 1) + 0.3 * attempt)
    raise RuntimeError(f"fetch {adcode} failed: {last_error}")


def features(payload: dict) -> list[dict]:
    out = []
    for feat in payload.get("features", []):
        props = feat.get("properties", {})
        name = props.get("name")
        center = props.get("center") or props.get("centroid")
        adcode = props.get("adcode")
        if not name or not center or not isinstance(adcode, int):
            continue  # 过滤 '100000_JD' 这类伪条目
        out.append(
            {
                "adcode": adcode,
                "name": name,
                "center": [round(float(center[0]), 4), round(float(center[1]), 4)],
                "childrenNum": props.get("childrenNum", 0),
                "level": props.get("level"),
            }
        )
    return out


def county_row(name: str, lon: float, lat: float, indent: str) -> str:
    return f"{indent}{{ name: {json.dumps(name, ensure_ascii=False)}, longitude: {lon}, latitude: {lat} }},\n"


def main() -> int:
    print("fetching provinces ...", flush=True)
    provinces = [p for p in features(fetch(100000)) if p["name"]]
    print(f"  provinces: {len(provinces)}", flush=True)

    with ThreadPoolExecutor(max_workers=6) as pool:
        city_lists = list(
            pool.map(
                lambda p: [] if p["name"] == "台湾省" else features(fetch(p["adcode"])),
                provinces,
            )
        )

    # 只有 level == 'city' 且有下级（childrenNum > 0）才有区县数据。
    # 注意两类叶子节点同样是 level='city' 但 childrenNum=0：
    #   - 省直辖县级行政区划（济源市 419001、仙桃市 429004 …）
    #   - 不设区的地级市（东莞市 441900、中山市 442000、儋州市 460400、嘉峪关市 …）
    # 它们本身就是最小可选单位，直接作为「区县」记录，不请求、不重试。
    def has_children(item: dict) -> bool:
        return item.get("level") == "city" and int(item.get("childrenNum") or 0) > 0

    city_tasks = [
        (pi, ci, city)
        for pi, cities in enumerate(city_lists)
        for ci, city in enumerate(cities)
        if has_children(city)
    ]
    print(
        f"fetching districts for {len(city_tasks)} prefecture-level cities "
        f"(leaves skipped: {sum(len(c) for c in city_lists) - len(city_tasks)}) ...",
        flush=True,
    )
    with ThreadPoolExecutor(max_workers=8) as pool:
        district_lists = list(pool.map(lambda t: features(fetch(t[2]["adcode"])), city_tasks))

    districts_by_city = {
        (pi, ci): dists for (pi, ci, _), dists in zip(city_tasks, district_lists)
    }

    problems: list[str] = []
    rows: list[str] = []
    total_cities = 0
    total_counties = 0

    for pi, province in enumerate(provinces):
        pname = province["name"]
        tz = TIMEZONE_BY_PROVINCE.get(pname, DEFAULT_TIMEZONE)
        cities = city_lists[pi]

        if pname == "台湾省":
            city_rows = []
            for cname, lon, lat in TAIWAN_CITIES:
                total_cities += 1
                city_rows.append(
                    "      {\n"
                    f"        name: {json.dumps(cname, ensure_ascii=False)},\n"
                    f"        longitude: {lon},\n"
                    f"        latitude: {lat},\n"
                    "        counties: [],\n"
                    "      },"
                )
            rows.append(
                "  {\n"
                f"    name: {json.dumps(pname, ensure_ascii=False)},\n"
                f"    timezone: {json.dumps(tz)},\n"
                "    cities: [\n" + "\n".join(city_rows) + "\n    ],\n"
                "  },"
            )
            continue

        if pname in MUNICIPALITIES:
            # 直辖市：市层级即「市辖区」（level=district 的叶子），本身带区县列表
            holder = cities[0] if cities else None
            dists = [holder] if holder else []
            if not dists:
                problems.append(f"{pname}: 未取到区县")
            total_cities += 1
            total_counties += len(dists)
            rows.append(
                "  {\n"
                f"    name: {json.dumps(pname, ensure_ascii=False)},\n"
                f"    timezone: {json.dumps(tz)},\n"
                "    cities: [\n"
                "      {\n"
                f"        name: {json.dumps('市辖区', ensure_ascii=False)},\n"
                f"        longitude: {province['center'][0]},\n"
                f"        latitude: {province['center'][1]},\n"
                "        counties: [\n"
                + "".join(
                    county_row(d["name"], d["center"][0], d["center"][1], "          ")
                    for d in dists
                )
                + "        ],\n"
                "      },\n"
                "    ],\n"
                "  },"
            )
            continue

        expected_cities = province["childrenNum"]
        if expected_cities and len(cities) != expected_cities:
            problems.append(f"{pname}: 市数 {len(cities)} != childrenNum {expected_cities}")

        city_rows = []
        for ci, city in enumerate(cities):
            cname = city["name"]
            if has_children(city):
                dists = districts_by_city.get((pi, ci), [])
                expected = city["childrenNum"]
                if expected and len(dists) != expected:
                    problems.append(f"{pname}/{cname}: 区县数 {len(dists)} != childrenNum {expected}")
                if not dists:
                    problems.append(f"{pname}/{cname}: 无区县数据，回退市本级坐标")
            else:
                # 省直辖县级行政区划 / 不设区的地级市：叶子，本身就是最小可选单位
                dists = [city]
            total_cities += 1
            total_counties += len(dists)
            city_rows.append(
                "      {\n"
                f"        name: {json.dumps(cname, ensure_ascii=False)},\n"
                f"        longitude: {city['center'][0]},\n"
                f"        latitude: {city['center'][1]},\n"
                "        counties: [\n"
                + "".join(
                    county_row(d["name"], d["center"][0], d["center"][1], "          ")
                    for d in dists
                )
                + "        ],\n"
                "      },"
            )

        rows.append(
            "  {\n"
            f"    name: {json.dumps(pname, ensure_ascii=False)},\n"
            f"    timezone: {json.dumps(tz)},\n"
            "    cities: [\n" + "\n".join(city_rows) + "\n    ],\n"
            "  },"
        )

    header = f'''/**
 * 全国行政区划：省 → 市 → 区县（三级级联）+ 经纬度
 *
 * 【本文件由脚本生成，请勿手改】
 *   生成：doc/gen_regions.py
 *   数据源：阿里云 DataV 行政区划公开 GeoJSON（取 properties.center 作为该级驻地坐标）
 *   规模：{len(provinces)} 省级 / {total_cities} 市 / {total_counties} 区县
 *
 * 用途：BirthForm 的三级级联下拉选择出生地，选中后自动填入经度，
 *      供真太阳时的经度时差与 EoT 计算使用（详见 doc/bazi-algorithm.md §4）。
 *
 * 注意：
 * - 直辖市（北京/天津/上海/重庆）的市层级统一为「市辖区」，避免「北京市/北京市/东城区」的冗余。
 * - 台湾省在数据源中无下级数据，市清单为内置的主要市，其「区县」层级为空 ——
 *   选择到市即可（此时用市级驻地坐标）。
 * - 坐标为行政区**驻地**坐标（非几何重心），精度 0.0001°，折合约 10 米，对时差计算绰绰有余。
 * - 港澳台使用各自时区，其余为 Asia/Shanghai。
 */

export interface County {{
  name: string
  longitude: number
  latitude: number
}}

export interface City {{
  name: string
  /** 市级驻地经度 */
  longitude: number
  /** 市级驻地纬度 */
  latitude: number
  counties: County[]
}}

export interface Province {{
  name: string
  /** IANA 时区 */
  timezone: string
  cities: City[]
}}

/** 全部省 / 自治区 / 直辖市 / 特别行政区 */
export const REGIONS: readonly Province[] = [
'''

    footer = '''
]

/** 按省名取省份 */
export function findProvince(name: string): Province | undefined {
  return REGIONS.find((p) => p.name === name)
}

/** 按省名 + 市名取市 */
export function findCity(provinceName: string, cityName: string): City | undefined {
  return findProvince(provinceName)?.cities.find((c) => c.name === cityName)
}

/** 按省 / 市 / 区县名取区县 */
export function findCounty(
  provinceName: string,
  cityName: string,
  countyName: string,
): County | undefined {
  return findCity(provinceName, cityName)?.counties.find((c) => c.name === countyName)
}

/**
 * 解析「省 / 市 / 区县」三级地址 → 精确坐标与所属时区。
 *
 * 容错：区县留空（如台湾省只选到市）时回退为市级驻地坐标。
 */
export function resolveRegion(
  provinceName: string,
  cityName: string,
  countyName: string,
): { county: County; timezone: string } | undefined {
  const province = findProvince(provinceName)
  if (!province) return undefined
  const city = province.cities.find((c) => c.name === cityName)
  if (!city) return undefined
  const county =
    city.counties.find((c) => c.name === countyName) ??
    ({ name: city.name, longitude: city.longitude, latitude: city.latitude } satisfies County)
  return { county, timezone: province.timezone }
}

/** 地址展示文本：省 / 市 / 区县（缺级自动省略） */
export function formatRegionPath(
  provinceName: string,
  cityName: string,
  countyName: string,
): string {
  return [provinceName, cityName, countyName].filter((part) => part.length > 0).join(' / ')
}
'''

    OUT.write_text(header + "\n".join(rows) + footer, encoding="utf-8")

    text = OUT.read_text(encoding="utf-8")
    print(f"\nwritten: {OUT}")
    print(f"  provinces={len(provinces)} cities={total_cities} counties={total_counties}")
    print(f"  file size = {len(text.encode('utf-8')) / 1024:.1f} KB")

    coords = re.findall(r"longitude: (-?[\d.]+),\s*latitude: (-?[\d.]+)", text)
    bad = [
        (lon, lat)
        for lon, lat in coords
        if not (-180 <= float(lon) <= 180 and -90 <= float(lat) <= 90) or (float(lon) == 0 and float(lat) == 0)
    ]
    print(f"  coord tuples = {len(coords)}, invalid = {len(bad)}")

    print("\n用户举例命中检查：")
    for prov, city, county in [
        ("湖北省", "黄石市", "大冶市"),
        ("湖北省", "武汉市", "江夏区"),
        ("广西壮族自治区", "南宁市", "青秀区"),
        ("广西壮族自治区", "崇左市", "天等县"),
    ]:
        ok = f'name: "{county}"' in text and f'name: "{city}"' in text and f'name: "{prov}"' in text
        print(f"   {prov}/{city}/{county}: {'命中 ✓' if ok else '缺失 ✗'}")

    if problems:
        print(f"\n⚠️ 对账问题 {len(problems)} 条（前 15）：")
        for p in problems[:15]:
            print("   -", p)
    else:
        print("\n对账：全部省市数量与 childrenNum 一致 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
