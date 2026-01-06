.PHONY: help setup-backend setup-frontend build run migrate test clean

help:
	@echo "Available commands:"
	@echo "  make setup-backend    - Set up Django backend"
	@echo "  make setup-frontend   - Set up React frontend"
	@echo "  make build            - Build Docker images"
	@echo "  make run              - Run with docker-compose"
	@echo "  make migrate          - Run Django migrations"
	@echo "  make test             - Run tests"
	@echo "  make clean            - Clean up generated files"

setup-backend:
	cd backend && python -m venv venv && \
	. venv/bin/activate && \
	pip install -r requirements.txt && \
	python manage.py migrate

setup-frontend:
	cd frontend && npm install

build:
	docker-compose build

run:
	docker-compose up

migrate:
	docker-compose exec backend python manage.py migrate

test:
	docker-compose exec backend python manage.py test

clean:
	find . -type d -name __pycache__ -exec rm -r {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} +

