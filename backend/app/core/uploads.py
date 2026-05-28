# 초보자 안내:
# 업로드 파일 개수와 크기를 공통으로 검사하는 작은 유틸입니다.
# 분석 API와 시각화 API가 같은 기준을 쓰게 해서 배포 후 장애를 줄입니다.

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


def _human_mb(byte_count: int) -> str:
    return f"{byte_count / 1024 / 1024:.1f}MB"


def validate_upload_count(files: list[UploadFile], *, required: bool = False) -> None:
    if required and not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="분석할 파일을 업로드해주세요.")

    if len(files) > settings.max_upload_files:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"한 번에 업로드할 수 있는 파일은 최대 {settings.max_upload_files}개입니다.",
        )


async def read_upload_content(upload: UploadFile) -> bytes:
    filename = upload.filename or "파일"
    content = await upload.read()

    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{filename} 파일이 비어 있습니다.")

    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"{filename} 파일 크기({_human_mb(len(content))})가 "
                f"허용 용량({_human_mb(settings.max_upload_bytes)})을 초과했습니다."
            ),
        )

    return content
