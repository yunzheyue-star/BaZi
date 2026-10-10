"""按 src/components/PillarCard.vue 与 PillarsGrid.vue 的实际 CSS 数值，渲染版式规格图。

用途：几何校验（天干/地支上下结构、三种时钟对照条）与给人看的预览。
不是浏览器截图 —— 数值取自组件样式，由本脚本重绘。
"""

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = "doc"
W, H = 1180, 720
BG = "#f6f7f9"
CARD = "#ffffff"
BORDER = "#e2e5ea"
CHIP = "#f2f4f7"
TEXT = "#1f2329"
MUTED = "#6b7280"
PRIMARY = "#3a6fbf"
PRIMARY_SOFT = "#e8f0fb"

WX = {"木": "#2f9e6f", "火": "#d9414a", "土": "#a9762f", "金": "#c2a13a", "水": "#3a6fbf"}
GAN_WX = {"甲": "木", "乙": "木", "丙": "火", "丁": "火", "戊": "土", "己": "土",
          "庚": "金", "辛": "金", "壬": "水", "癸": "水"}
ZHI_WX = {"子": "水", "丑": "土", "寅": "木", "卯": "木", "辰": "土", "巳": "火",
          "午": "火", "未": "土", "申": "金", "酉": "金", "戌": "土", "亥": "水"}


def font(path, size):
    return ImageFont.truetype(path, size)


F_SANS = "C:/Windows/Fonts/msyh.ttc"
F_SANS_BD = "C:/Windows/Fonts/msyhbd.ttc"
F_SERIF = "C:/Windows/Fonts/simsun.ttc"

f_label = font(F_SANS_BD, 13)      # .label / 卡片标题
f_small = font(F_SANS, 11)         # .k / .index
f_char = font(F_SERIF, 42)         # .char 字号 42px
f_god = font(F_SANS, 13)           # .ten-god 13px
f_hidden = font(F_SERIF, 12)       # 藏干 12px
f_hidden_meta = font(F_SANS, 12)
f_title = font(F_SANS_BD, 17)
f_bazi = font(F_SERIF, 21)
f_clock_label = font(F_SANS, 12)
f_clock_value = font(F_SANS_BD, 17)
f_h3 = font(F_SANS_BD, 13)

# 四柱数据（2008-07-16 10:33 男 / 真太阳时口径的实际结果）
PILLARS = [
    {"label": "年柱", "k": 24, "stem": "戊", "branch": "子", "god": "伤官",
     "hidden": [("癸", "七杀")], "idx": "干 4 · 支 0", "master": False},
    {"label": "月柱", "k": 55, "stem": "己", "branch": "未", "god": "食神",
     "hidden": [("己", "食神"), ("丁", "比肩"), ("乙", "偏印")], "idx": "干 5 · 支 7", "master": False},
    {"label": "日柱", "k": 53, "stem": "丁", "branch": "巳", "god": "日主",
     "hidden": [("丙", "劫财"), ("庚", "正财"), ("戊", "伤官")], "idx": "干 3 · 支 5", "master": True},
    {"label": "时柱", "k": 41, "stem": "乙", "branch": "巳", "god": "偏印",
     "hidden": [("丙", "劫财"), ("庚", "正财")], "idx": "干 1 · 支 5", "master": False},
]

CLOCKS = [
    {"label": "平太阳时", "value": "10:33", "used": True},
    {"label": "真太阳时", "value": "10:13", "used": False},
]


def center_text(draw, box, text, fnt, fill):
    x0, y0, x1, y1 = box
    left, top, right, bottom = draw.textbbox((0, 0), text, font=fnt)
    draw.text((x0 + (x1 - x0 - (right - left)) / 2 - left,
               y0 + (y1 - y0 - (bottom - top)) / 2 - top), text, font=fnt, fill=fill)


def right_text(draw, x_right, y, text, fnt, fill):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=fnt)
    draw.text((x_right - (right - left) - left, y), text, font=fnt, fill=fill)


def dot(draw, x, y, r, fill):
    draw.ellipse((x - r, y - r, x + r, y + r), fill=fill)


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# ===== 卡片 =====
CARD_BOX = (20, 16, W - 20, H - 16)
rounded(d, CARD_BOX, 14, CARD, BORDER)
d.text((44, 34), "四柱", font=f_title, fill=TEXT)
d.text((44, 62), "戊子 己未 丁巳 乙巳", font=f_bazi, fill=TEXT)

d.text((W - 400, 34), "时辰所用（真太阳时）", font=f_small, fill=MUTED)
d.text((W - 400, 50), "真太阳时 10:13（−20.5 分）", font=f_hidden_meta, fill=TEXT)
d.text((W - 190, 34), "节气", font=f_small, fill=MUTED)
d.text((W - 190, 50), "小暑 · 月令 6", font=f_hidden_meta, fill=TEXT)

# ===== 两档时钟对照条：等价于 .clocks 两列 =====
STRIP_TOP = 92
STRIP_H = 46
GAP = 10
inner_x0, inner_x1 = 44, W - 44
col_w = (inner_x1 - inner_x0 - GAP) // 2
for i, clock in enumerate(CLOCKS):
    x0 = inner_x0 + i * (col_w + GAP)
    box = (x0, STRIP_TOP, x0 + col_w, STRIP_TOP + STRIP_H)
    rounded(d, box, 10, PRIMARY_SOFT if clock["used"] else CHIP,
            PRIMARY if clock["used"] else None)
    d.text((x0 + 14, STRIP_TOP + 15), clock["label"], font=f_clock_label,
           fill=PRIMARY if clock["used"] else MUTED)
    right_text(d, x0 + col_w - 14, STRIP_TOP + 11, clock["value"], f_clock_value,
               PRIMARY if clock["used"] else TEXT)

# ===== 四柱：天干在上、地支在下 =====
GRID_TOP = STRIP_TOP + STRIP_H + 20
GRID_GAP = 12
card_w = (inner_x1 - inner_x0 - GRID_GAP * 3) // 4
card_h = 350
for i, p in enumerate(PILLARS):
    x0 = inner_x0 + i * (card_w + GRID_GAP)
    box = (x0, GRID_TOP, x0 + card_w, GRID_TOP + card_h)
    rounded(d, box, 12, CARD, PRIMARY if p["master"] else BORDER, 2 if p["master"] else 1)
    cx = x0 + card_w // 2

    # header：label 左、k 右
    d.text((x0 + 14, GRID_TOP + 12), p["label"], font=f_label, fill=TEXT)
    right_text(d, x0 + card_w - 14, GRID_TOP + 14, f"k={p['k']}", f_small, MUTED)

    # .chars：flex column / align center / gap 2px / padding 4px 0 6px
    chars_top = GRID_TOP + 44 + 4
    stem_box = (cx - 28, chars_top, cx + 28, chars_top + 50)
    center_text(d, stem_box, p["stem"], f_char, WX[GAN_WX[p["stem"]]])
    # 肩线：stem 的 border-bottom（min-width 56px）
    line_y = chars_top + 50 + 4 + 2
    d.line((cx - 28, line_y, cx + 28, line_y), fill=BORDER)
    branch_top = line_y + 6
    branch_box = (cx - 28, branch_top, cx + 28, branch_top + 50)
    center_text(d, branch_box, p["branch"], f_char, WX[ZHI_WX[p["branch"]]])

    # .ten-god
    god_top = branch_top + 54
    god_fill = PRIMARY_SOFT if p["master"] else CHIP
    rounded(d, (x0 + 12, god_top, x0 + card_w - 12, god_top + 24), 6, god_fill)
    center_text(d, (x0 + 12, god_top, x0 + card_w - 12, god_top + 24), p["god"], f_god,
                PRIMARY if p["master"] else MUTED)

    # 藏干行
    row_top = god_top + 32
    for stem, god in p["hidden"]:
        rounded(d, (x0 + 12, row_top, x0 + card_w - 12, row_top + 22), 4, CHIP)
        d.text((x0 + 20, row_top + 4), stem, font=f_hidden, fill=WX[GAN_WX[stem]])
        right_text(d, x0 + card_w - 20, row_top + 4, god, f_hidden_meta, MUTED)
        row_top += 26

    # .index（margin-top:auto → 始终贴卡片底部，四张卡对齐）
    center_text(d, (x0, GRID_TOP + card_h - 30, x0 + card_w, GRID_TOP + card_h - 12),
                p["idx"], f_small, MUTED)
    d.line((x0 + 12, GRID_TOP + card_h - 34, x0 + card_w - 12, GRID_TOP + card_h - 34),
           fill="#eef0f3")

    # 肩线贯穿标注（仅第一柱）
    if i == 0:
        d.line((x0 + 4, line_y, x0 + card_w - 4, line_y), fill="#e8a0a0")

# ===== 五行计数（本气视图）：修正 bug 后的实际数值 =====
BAL_TOP = GRID_TOP + card_h + 16
d.text((inner_x0, BAL_TOP), "五行计数 · 天干 + 地支本气", font=f_h3, fill=MUTED)
d.text((inner_x0 + 250, BAL_TOP), "合计 8", font=f_h3, fill=TEXT)
right_text(d, inner_x1, BAL_TOP - 2, "展开藏干细算", f_clock_label, TEXT)

BAR_TOP = BAL_TOP + 24
BAR_H = 10
WUXING_COUNTS = [("木", 1), ("火", 3), ("土", 3), ("金", 0), ("水", 1)]
max_count = max(n for _, n in WUXING_COUNTS)
label_w, count_w, row_gap = 22, 30, 8
bar_x0 = inner_x0 + label_w + 8
bar_x1 = inner_x1 - count_w - 8
for name, count in WUXING_COUNTS:
    rounded(d, (bar_x0, BAR_TOP, bar_x1, BAR_TOP + BAR_H), 5, CHIP)
    if count > 0:
        width = int((bar_x1 - bar_x0) * count / max_count)
        rounded(d, (bar_x0, BAR_TOP, bar_x0 + width, BAR_TOP + BAR_H), 5, WX[name])
    d.text((inner_x0, BAR_TOP - 4), name, font=f_hidden_meta, fill=TEXT)
    right_text(d, inner_x1, BAR_TOP - 4, str(count), f_hidden_meta, TEXT)
    BAR_TOP += BAR_H + row_gap

# ===== 单元测试等价校验 =====
def check():
    errs = []
    # 天干必须在地支上方（上下结构）
    for i, p in enumerate(PILLARS):
        if not p["stem"] or not p["branch"]:
            errs.append(f"柱{i} 缺失")
    # 肩线位置必须在两字之间
    if not (chars_top + 50 < line_y < branch_top):
        errs.append("肩线未落在天干与地支之间")
    # 四柱横向不重叠
    if inner_x0 + 4 * card_w + 3 * GRID_GAP > inner_x1 + 1:
        errs.append("四柱横向溢出卡片")
    # 卡片纵向不溢出
    if GRID_TOP + card_h > CARD_BOX[3] - 8:
        errs.append("四柱卡片纵向溢出")
    # 时钟两列不重叠
    if inner_x0 + 2 * col_w + GAP > inner_x1 + 1:
        errs.append("时钟两列横向溢出")
    return errs


OUT_DIR = "."

errors = check()
img.save(f"{OUT_DIR}/layout-pillars.png")
print("saved doc/layout-pillars.png", img.size)
print("geometry check:", "OK" if not errors else errors)
print(f"card_w={card_w} card_h={card_h} col_w={col_w} 肩线y={line_y}")
