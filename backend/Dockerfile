FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 비루트 유저 생성 (k8s 보안 컨텍스트와 정합)
RUN groupadd --system app && useradd --system --gid app --home /app app

WORKDIR /app

# 의존성 설치 (사내 PyPI 프록시 사용)
COPY requirements.txt .
RUN pip install \
    --index-url http://repository.samsungds.net/repository/proxy-pypi-files.pythonhosted.org/simple \
    --trusted-host repository.samsungds.net \
    -r requirements.txt

# 애플리케이션 소스 복사
COPY app ./app
COPY resources ./resources

RUN chown -R app:app /app
USER app

EXPOSE 8000

# k8s 환경에서는 TLS를 Ingress에서 종료하므로 컨테이너는 평문 HTTP로 기동
# proxy-headers: Ingress가 넣어주는 X-Forwarded-* 신뢰 (client IP/scheme 정확화)
# exec form: uvicorn이 PID 1이 되어 k8s SIGTERM을 직접 받아 graceful shutdown 가능
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*"]
