fetch('http://localhost:5000/api/generate', {method: 'POST'})
  .then(async r => console.log(r.status, await r.text()))
  .catch(e => console.error(e))
