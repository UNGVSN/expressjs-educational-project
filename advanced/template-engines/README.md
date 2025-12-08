# Template Engines

Template engines enable server-side rendering of dynamic HTML pages in Express applications.

## Overview

```javascript
const express = require('express')
const app = express()

// Configure template engine
app.set('view engine', 'pug')
app.set('views', './views')

// Render a view
app.get('/', (req, res) => {
  res.render('index', { title: 'Home', user: req.user })
})
```

## Supported Engines

| Engine | Extension | Style |
|--------|-----------|-------|
| Pug | .pug | Indentation-based |
| EJS | .ejs | Embedded JavaScript |
| Handlebars | .hbs | Logic-less templates |
| Nunjucks | .njk | Jinja2-inspired |

## Pug

### Installation

```bash
npm install pug
```

### Setup

```javascript
app.set('view engine', 'pug')
app.set('views', './views')
```

### Syntax

```pug
//- views/layout.pug
doctype html
html
  head
    title= title
    link(rel='stylesheet', href='/css/style.css')
  body
    header
      nav
        a(href='/') Home
        a(href='/about') About
    block content
    footer
      p &copy; 2024

//- views/index.pug
extends layout

block content
  h1= title
  if user
    p Welcome, #{user.name}!
  else
    p Please log in

  ul
    each item in items
      li= item.name
```

### Features

```pug
//- Variables
h1= title
p Hello #{name}

//- Conditionals
if user
  p Welcome #{user.name}
else
  p Please log in

//- Loops
ul
  each item in items
    li= item.name

//- Mixins (reusable components)
mixin card(title, content)
  .card
    h3= title
    p= content

+card('Title', 'Content')

//- Includes
include header
include footer
```

## EJS

### Installation

```bash
npm install ejs
```

### Setup

```javascript
app.set('view engine', 'ejs')
app.set('views', './views')
```

### Syntax

```html
<!-- views/layout.ejs -->
<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
</head>
<body>
  <%- include('partials/header') %>
  <%- body %>
  <%- include('partials/footer') %>
</body>
</html>

<!-- views/index.ejs -->
<h1><%= title %></h1>

<% if (user) { %>
  <p>Welcome, <%= user.name %>!</p>
<% } else { %>
  <p>Please log in</p>
<% } %>

<ul>
  <% items.forEach(item => { %>
    <li><%= item.name %></li>
  <% }) %>
</ul>
```

### Tags

| Tag | Purpose |
|-----|---------|
| `<%= %>` | Output escaped value |
| `<%- %>` | Output unescaped value |
| `<% %>` | Execute JavaScript |
| `<%# %>` | Comment |
| `<%_ %>` | Strip whitespace before |
| `_%>` | Strip whitespace after |

## Handlebars

### Installation

```bash
npm install express-handlebars
```

### Setup

```javascript
const exphbs = require('express-handlebars')

app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main'
}))
app.set('view engine', 'hbs')
app.set('views', './views')
```

### Syntax

```handlebars
{{! views/layouts/main.hbs }}
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
</head>
<body>
  {{> header}}
  {{{body}}}
  {{> footer}}
</body>
</html>

{{! views/index.hbs }}
<h1>{{title}}</h1>

{{#if user}}
  <p>Welcome, {{user.name}}!</p>
{{else}}
  <p>Please log in</p>
{{/if}}

<ul>
  {{#each items}}
    <li>{{this.name}}</li>
  {{/each}}
</ul>
```

### Helpers

```javascript
// Custom helpers
const hbs = exphbs.create({
  helpers: {
    formatDate: (date) => {
      return new Date(date).toLocaleDateString()
    },
    uppercase: (str) => str.toUpperCase(),
    eq: (a, b) => a === b
  }
})

app.engine('hbs', hbs.engine)
```

```handlebars
{{formatDate createdAt}}
{{uppercase name}}
{{#if (eq status 'active')}}Active{{/if}}
```

## Nunjucks

### Installation

```bash
npm install nunjucks
```

### Setup

```javascript
const nunjucks = require('nunjucks')

nunjucks.configure('views', {
  autoescape: true,
  express: app,
  watch: process.env.NODE_ENV !== 'production'
})

app.set('view engine', 'njk')
```

### Syntax

```njk
{# views/layout.njk #}
<!DOCTYPE html>
<html>
<head>
  <title>{{ title }}</title>
</head>
<body>
  {% include "partials/header.njk" %}
  {% block content %}{% endblock %}
  {% include "partials/footer.njk" %}
</body>
</html>

{# views/index.njk #}
{% extends "layout.njk" %}

{% block content %}
<h1>{{ title }}</h1>

{% if user %}
  <p>Welcome, {{ user.name }}!</p>
{% else %}
  <p>Please log in</p>
{% endif %}

<ul>
  {% for item in items %}
    <li>{{ item.name }}</li>
  {% endfor %}
</ul>
{% endblock %}
```

## res.render()

```javascript
// Basic render
app.get('/', (req, res) => {
  res.render('index')
})

// With data
app.get('/users', (req, res) => {
  res.render('users', {
    title: 'Users',
    users: [...],
    currentPage: 1
  })
})

// With callback
app.get('/report', (req, res) => {
  res.render('report', data, (err, html) => {
    if (err) return res.status(500).send('Render error')
    res.send(html)
  })
})
```

## res.locals

Data available to all templates.

```javascript
// Global data
app.use((req, res, next) => {
  res.locals.siteName = 'My App'
  res.locals.currentYear = new Date().getFullYear()
  res.locals.user = req.user
  next()
})

// In template
// {{ siteName }} - available everywhere
```

## app.locals

Application-wide data.

```javascript
app.locals.appName = 'My Application'
app.locals.version = '1.0.0'

// Available in all templates without passing
```

## Caching

```javascript
// Enable in production
if (process.env.NODE_ENV === 'production') {
  app.set('view cache', true)
}

// Or disable explicitly
app.set('view cache', false)
```

## Multiple Engines

```javascript
// Use multiple engines
app.engine('pug', require('pug').__express)
app.engine('ejs', require('ejs').__express)

app.get('/pug-page', (req, res) => {
  res.render('page.pug', data)
})

app.get('/ejs-page', (req, res) => {
  res.render('page.ejs', data)
})
```

## Best Practices

1. **Use layouts** - Avoid duplication
2. **Use partials** - Reusable components
3. **Escape output** - Prevent XSS
4. **Enable caching** - In production
5. **Use locals** - For common data
6. **Keep logic minimal** - In templates

## Related

- [database-integration](../database-integration/) - Data for templates
- [security](../security/) - XSS prevention

---

*Template engines enable dynamic server-rendered pages in Express.*
