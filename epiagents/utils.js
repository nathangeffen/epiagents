"use strict";

function setupAsides()
{
    let asides = document.querySelectorAll("aside");
    for (let aside of asides) {
        let children = aside.children;
        for (let child of children) {
            if (child.tagName === "H1") {
                let button = document.createElement("button");
                button.classList.add("open-close");
                button.textContent = "+";
                button.addEventListener('click', function(e) {
                    console.log("Clicked");
                    if (e.target.textContent === "+") {
                        console.log("A", children.length);
                        for (let c of children) {
                            c.classList.remove('aside-hide');
                        }
                        e.target.textContent = '-';
                    } else {
                        console.log("B", children.length);
                        for (let c of children) {
                            if (c.tagName !== "H1") {
                                c.classList.add('aside-hide');
                            }
                        }
                        e.target.textContent = '+';
                    }
                });
                child.append(button);
            } else {
                child.classList.add("aside-hide");
            }
        }
    }
}

setupAsides();

window.MathJax = {
  tex: {
    tags: 'ams',
    inlineMath: [['$', '$'], ['\\(', '\\)']]
  },
};
