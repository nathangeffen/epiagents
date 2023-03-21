"use strict";


function setupAsides()
{
  let asides = document.querySelectorAll("aside");
  for (let aside of asides) {
    let div = aside.querySelector('div');
    div.classList.add('hide');
    let bar = aside.querySelector('button');
    bar.addEventListener('click', function(e) {
      if (div.classList.contains('show')) {
        div.classList.remove('show');
        div.classList.add('hide');
      } else {
        div.classList.add('show');
        div.classList.remove('hide');
      }
    });
  }
}

function makeTOCTable(selectors, useLevels)
{
  const selector = selectors.join();
  const headings = document.querySelectorAll(selector);
  let toc = [];
  let current_level = 0;
  let levelArr = [0];
  for (const heading of headings) {
    if (useLevels) {
      const level = selectors.indexOf(heading.nodeName.toLowerCase());
      if (level == current_level) {
        ++levelArr[levelArr.length - 1];
      } else {
        if (level > current_level) {
          levelArr.push(1);
        } else {
          levelArr.pop();
          ++levelArr[levelArr.length - 1];
        }
        current_level = level;
      }
    } else {
      ++current_level;
    }

    const prefix = useLevels ? (levelArr.join('.') + '.\t') : "";
    const entry = {
      'prefix': prefix,
      'class': 'level-' + heading.nodeName.toLowerCase(),
      'text': prefix + heading.textContent,
      'node': heading,
      'id': useLevels ? levelArr.join('_') : current_level + "_"
    }
    toc.push(entry);
  }
  return toc;
}

function displayTOCTable(tocClass, selector, prefix, useLevels)
{
  const elem = document.querySelector(tocClass);
  if (elem) {
    const toc = makeTOCTable(selector, useLevels);
    let div = document.createElement('div');
    let ul = document.createElement('ul');
    div.append(ul);
    elem.append(div);
    for (let entry of toc) {
      const id = prefix + entry.id;
      let li = document.createElement('li');
      li.classList.add(entry['class']);
      let link = document.createElement('a');
      link.setAttribute('href', "#" + id);
      link.textContent = entry.text;
      li.append(link);
      ul.append(li);
      let target = document.createElement('a');
      target.id = id;
      const saved_html = entry.node.innerHTML;
      entry.node.innerHTML = "";
      entry.node.append(target);
      entry.node.innerHTML += entry.prefix + saved_html;
    }
  }
}



function manageFootnotes() {

  const footnotes = document.querySelectorAll(".footnote");
  let i = 1;
  for (let footnote of footnotes) {
    footnote.classList.add('footnote-hide');
    let span = document.createElement('span');
    span.classList.add('footnote-curtain');
    span.textContent = i++;
    span.addEventListener('click', function(e) {
      if (footnote.classList.contains('footnote-show')) {
        footnote.classList.remove('footnote-show');
        footnote.classList.add('footnote-hide');
      } else {
        footnote.classList.add('footnote-show');
        footnote.classList.remove('footnote-hide');
      }
    });
    footnote.parentNode.insertBefore(span, footnote);
  }
}

window.MathJax = {
    tex: {
        tags: 'ams',
        inlineMath: [['$', '$'], ['\\(', '\\)']],
    },
    chtml: {
        displayAlign: "left",
        displayIndent: '32px'
    },
};

setupAsides();
displayTOCTable('#table-of-contents', ['h2', 'h3', 'h4'], "_toc_", true);
displayTOCTable('#table-of-asides', ['aside > button'], "_aside_", false);
manageFootnotes();
