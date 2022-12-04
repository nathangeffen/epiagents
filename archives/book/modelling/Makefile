modelling.html: modelling.md
	pandoc -s --bibliography=modelling.bib  --citeproc  -o modelling.html modelling.md

modelling.pdf: modelling.md
	pandoc -s --bibliography=modelling.bib  --citeproc --csl ../nejm.csl -o modelling.pdf modelling.md

modelling.epub: modelling.md
	pandoc -s --bibliography=modelling.bib  --citeproc  -o modelling.epub modelling.md
