# 몸 인식 모델 추가 기록 (2026-11-12)

- Google MediaPipe Pose Landmarker Lite, float16. 기존 Tasks Vision 번들을 그대로 사용.
- 공식 안내: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- 다운로드: https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
- 저장 크기: 5777746 bytes
- SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`
- 실행 시에는 동봉된 파일을 사용하며 외부 모델 서버에 접속하지 않음. 카메라 영상 저장·외부 전송 없음.
- 몸 후보 최대3명/분할 마스크 끔, 실제 조작자는 한 명. GPU 초기화 실패 시 CPU 재시도.
