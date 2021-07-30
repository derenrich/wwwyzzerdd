import runQuery from './sparql'
import { ItemDB, getQidsFromTitles } from './itemData'
import {registerBackendBroker} from "./messageBroker";

registerBackendBroker();

/*runQuery(`
SELECT ?item ?itemLabel 
WHERE 
{
  ?item wdt:P31 wd:Q146.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
`);*/

//import {PropertyDB} from "./propertyData";

//const db = new PropertyDB();
//const x = db.parseUrl("https://www.imdb.com/title/tt0010773/")
//db.getProperties().then(console.log)

//let r = getQidsFromTitles(["berlin", "Tokyo", "NYC", "helicopter"]);
//r.then(console.log)


//let items = new ItemDB();
//let res = items.lookupTitles(["pants", "airplane", "hanger", "Hanger", "WW2", "Paris"]);
//res.then((d) => Object.values(d)).then(items.lookupQidContent).then(console.log);