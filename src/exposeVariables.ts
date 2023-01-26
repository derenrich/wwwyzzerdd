// Exposes some key information from the mw.config data into the DOM

export function isExposed(): boolean {
    // have the variables been exposed yet
    const wikiNamespace = document.getElementsByTagName("body")[0].getAttribute("mw-ns") || "";
    return wikiNamespace !== "";
}

export function exposeWikiVariables() {
    let body = document.getElementsByTagName("body")[0];
    let conf = ((window as any).mw as any).config as any;
    let namespace = conf.get('wgNamespaceNumber' );
    let userLang = conf.get('wgUserLanguage');
    let articleId = conf.get('wgArticleId');
    let pageName = conf.get('wgPageName');
    let isPage = conf.get('wgIsArticle');
  
    body.setAttribute("mw-ns", namespace);
    body.setAttribute("mw-lang", userLang);
    body.setAttribute("mw-page-id", articleId);
    body.setAttribute("mw-page-name", pageName);
    body.setAttribute("mw-is-page", isPage);
  }