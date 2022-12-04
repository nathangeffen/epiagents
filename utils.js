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

window.MathJax = {
  tex: {
    tags: 'ams',
    inlineMath: [['$', '$'], ['\\(', '\\)']]
  },
};
