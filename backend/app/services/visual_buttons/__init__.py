# 초보자 안내: 프로젝트 동작에 필요한 설정 또는 보조 코드를 담은 파일입니다.

from .graph_visual import create_graph_visual
from .image_visual import create_image_visual
from .mindmap_visual import create_mindmap_visual
from .table_visual import create_table_visual


VISUAL_CREATORS = {
    "table": create_table_visual,
    "graph": create_graph_visual,
    "image": create_image_visual,
    "mindmap": create_mindmap_visual,
}
