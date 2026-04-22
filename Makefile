.PHONY: install start

install:
	pip3 install -r requirements.txt
	npm install

start:
	python3 backend/app.py & node server.js & wait
