"""Sổ đăng ký model — import mọi module model để `Base.metadata` biết đủ bảng.

Mỗi task thêm một model mới PHẢI thêm một dòng import vào đây, nếu không
`create_all` và Alembic autogenerate sẽ bỏ sót bảng đó.
"""

from app.models import identity  # noqa: F401
from app.models import workflow  # noqa: F401
from app.models import case  # noqa: F401
from app.models import document  # noqa: F401
from app.models import notification  # noqa: F401
from app.models import audit  # noqa: F401
