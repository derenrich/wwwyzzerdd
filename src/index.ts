const WBK = require('wikibase-sdk')

const wdk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql'
})



//function getItem(title: string): Promise<string> {
//    let url = wdk.getEntitiesFromSitelinks(title);
//    return fetch(url).then(r => r.json()).then(r => Object.keys(r.entities)[0]).then(handleResult);//
//}

//function handleResult(p: string) {
//    console.log(p);
//}

//function getSelection(): string {
//    window.getSelection()    
//}


const url = wdk.getEntitiesFromSitelinks({
  titles: 'Battle of Incheon',
  sites: 'enwiki',
  languages: ['en'],
  props: ['info'],
  format: 'json', // defaults to json
           redirections: true // defaults       to true
})


//getItem("Google");
