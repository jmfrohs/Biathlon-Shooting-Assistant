.PHONY: format help

help:
	@echo "Verfügbare Befehle:"
	@echo "  make format    - Formatiert alle Dateien und prüft Lizenz-Header"

format:
	python3 scripts/format.py
