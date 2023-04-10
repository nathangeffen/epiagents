#!/usr/bin/python
fi = open("model_example.cc", "r")
lines = fi.readlines()
with open("model_example_cc.html", "w") as fo:
    print("""
<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="author" content="Nathan Geffen" >
        <meta name="description" content="C++ example of micro model">
        <meta name="keywords" content="Epidemiology,models,micro models,macro models,agent-based models,simulation,infectious disease">
        <title>C++ example of micromodel</title>
    </head>
    <body>
        <pre class="prettyprint lang-cc" style="border:none;">
""", file=fo)
    for line in lines:
        line = line.replace("<", "&lt;")
        line = line.replace(">", "&gt;")
        print(line[:-1], file=fo)

    print("""
    </pre>
        <script src="https://cdn.jsdelivr.net/gh/google/code-prettify@master/loader/run_prettify.js"></script>
    </body>
    </head>
</html>
""", file=fo)
fi.close()

fi = open("model_example.py", "r")
lines = fi.readlines()
with open("model_example_py.html", "w") as fo:
    print("""
<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="author" content="Nathan Geffen" >
        <meta name="description" content="Python example of micro model">
        <meta name="keywords" content="Epidemiology,models,micro models,macro models,agent-based models,simulation,infectious disease">
        <title>Python example of micromodel</title>
    </head>
    <body>
        <pre class="prettyprint lang-py" style="border:none;">
""", file=fo)
    for line in lines:
        line = line.replace("<", "&lt;")
        line = line.replace(">", "&gt;")
        print(line[:-1], file=fo)

    print("""
    </pre>
        <script src="https://cdn.jsdelivr.net/gh/google/code-prettify@master/loader/run_prettify.js"></script>
    </body>
    </head>
</html>
""", file=fo)
fi.close()
