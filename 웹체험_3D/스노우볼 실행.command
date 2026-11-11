#!/bin/zsh
cd -- "${0:A:h}"
python3 serve.py
if [[ $? -ne 0 ]]; then
  echo "실행하지 못했습니다. 위 안내를 확인해주세요."
  read -r "?엔터를 누르면 닫습니다."
fi
