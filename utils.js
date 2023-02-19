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

setupAsides();

function makeTOCTable()
{
  const selectors = ['h2', 'h3', 'h4'];
  const selector = selectors.join();
  const headings = document.querySelectorAll(selector);
  let toc = [];
  let current_level = 2;
  let levelArr = [0];
  for (const heading of headings) {
    const level = parseInt(heading.nodeName[heading.nodeName.length - 1]);
    if (level == current_level) {
      ++levelArr[levelArr.length - 1];
    } else {
      if (level > current_level) {
        levelArr.push(1);
      } else {
        levelArr.pop();
      }
      current_level = level;
    }
    const prefix = levelArr.join('.') + '.\t';
    const entry = {
      'prefix': prefix,
      'class': 'level-' + heading.nodeName.toLowerCase(),
      'text': prefix + heading.textContent,
      'node': heading,
      'id': levelArr.join('_')
    }
    toc.push(entry);
  }
  return toc;
}

function displayTOCTable()
{
  const elem = document.querySelector('.toc');
  if (elem) {
    const toc = makeTOCTable();
    let ul = document.createElement('ul');
    elem.append(ul);
    for (let entry of toc) {
      let li = document.createElement('li');
      li.classList.add(entry['class']);
      let link = document.createElement('a');
      link.setAttribute('href', "#" + entry.id);
      link.textContent = entry.text;
      li.append(link);
      ul.append(li);
      let target = document.createElement('a');
      target.id = entry.id;
      const saved_html = entry.node.innerHTML;
      entry.node.innerHTML = "";
      entry.node.append(target);
      entry.node.innerHTML += entry.prefix + saved_html;
    }
  }
}

displayTOCTable();

window.MathJax = {
  tex: {
    tags: 'ams',
    inlineMath: [['$', '$'], ['\\(', '\\)']]
  },
  chtml: {
    displayAlign: "left",
    displayIndent: '32px'
  }
};
