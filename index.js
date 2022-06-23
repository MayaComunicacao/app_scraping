const puppeteer = require('puppeteer');
const cron = require('node-cron');
const fs = require('fs');
const { scrollPageToBottom } = require('puppeteer-autoscroll-down');

const total_pages = 5;
const show_browser = false;
const file_name = 'reviews';
const file_save_path = './reviews/';

const collect = async () => {
  const browser = await puppeteer.launch({ headless: !show_browser });
  const page = await browser.newPage();

  page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  const loop = async () => {
    console.log('buscando... aguarde...');

    let final_list = [];

    for (let i = 0; i <= total_pages; i++) {
      const urls = [
        'https://www.tripadvisor.com.br/Attraction_Review-g150807-d12866003-Reviews-Cancuners-Cancun_Yucatan_Peninsula.html',
        `https://www.tripadvisor.com.br/Attraction_Review-g150807-d12866003-Reviews-or${i}0-Cancuners-Cancun_Yucatan_Peninsula.html`,
      ];

      let url = i === 0 ? urls[0] : urls[1];

      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(4000);

      await scrollPageToBottom(page, { size: 250, delay: 450 });
  
      const list_per_page = await page.evaluate(() => {
        let arr;

        const class_search = {
          name: ['a.ui_header_link', '[data-automation=reviewCard] .ezLVz.f.M.k .fUpii'],
          pic: ['a.ui_social_avatar img', '[data-automation=reviewCard] .baYaB.f.u .cxvVq picture.dugSS._R.fXtOt img'],
          rating: ['[data-test-target=review-rating] span.ui_bubble_rating', '[data-automation=reviewCard] svg.RWYkj.d.H0'],
          review_title: ['[data-test-target=review-title] a span span', '[data-automation=reviewCard] .fUpii span'],
          review: ['q._a span', '[data-automation=reviewCard] ._T .WlYyy.diXIH.dDKKM span.NejBf'],
          date: ['.ui_header_link.bPvDb', '[data-automation=reviewCard] .fxays .WlYyy.diXIH.cspKb.bQCoY'],
        } // obj com arrays para ser usado na consulta dinâmica na opeção ternária abaixo;

        const body_node = document.querySelector('body');
        const body_has_class = body_node.classList.length > 0 ? true : false; // testa o body para checar se a há classe, retornando true ou false; para ser usado na operação ternária abaixo;

        // executa a operação ternária com base no resultado da operação ternária acima, para definir a classe para consulta de forma dinâmica dependendo da versão do página;
        let name_key_class = body_has_class ? class_search.name[0] : class_search.name[1];
        let profile_pic_key_class = body_has_class ? class_search.pic[0] : class_search.pic[1];
        let ratings_key_class = body_has_class ? class_search.rating[0] : class_search.rating[1];
        let review_title_key_class = body_has_class ? class_search.review_title[0] : class_search.review_title[1];
        let review_key_class = body_has_class ? class_search.review[0] : class_search.review[1];
        let date_key_class = body_has_class ? class_search.date[0] : class_search.date[1];

        // querys
        const node_list_names = document.querySelectorAll(name_key_class);
        arr = [...node_list_names];
        const names = arr.map(name => name.innerText);


        const node_list_img = document.querySelectorAll(profile_pic_key_class);
        arr = [...node_list_img];
        const pic_urls = arr.map(img => img.getAttribute('src'));


        const node_list_ratings = document.querySelectorAll(ratings_key_class);
        arr = [...node_list_ratings];
        const ratings = arr.map(rating => {
          if (body_has_class) {
            let classListRating = rating.classList[1];
            classListRating = classListRating.slice(classListRating.indexOf('_') + 1).split('').join('.');
            return classListRating;
          }

          let n = rating.ariaLabel;
          n = n.slice(0, 3).replace(',', '.');

          return n;
        });


        const node_list_reviews_title = document.querySelectorAll(review_title_key_class);
        arr = [...node_list_reviews_title];
        const reviews_title = arr.map(review_title => review_title.innerText);


        if (body_has_class) document.querySelectorAll('[data-test-target=expand-review]').forEach(btn => btn.click());
        const node_list_reviews = document.querySelectorAll(review_key_class);
        let reviews = [];
        node_list_reviews.forEach(review => reviews.push(review.textContent));
        

        const node_list_dates = document.querySelectorAll(date_key_class);
        let dates = [];
        node_list_dates.forEach(el => {
          if (body_has_class) {
            const str_html = el.parentNode.innerHTML;
            const date = (str_html.substring(str_html.lastIndexOf('>') + 1)).replace('escreveu uma avaliação ', '');
            dates.push(date);
          } else {
            dates.push(el.textContent.replace('Feita em ', ''));
          }
        });
        
        return names.map((name, key) => {
          return {
            name: name.trim(),
            profile_pic: pic_urls[key],
            ratings: ratings[key],
            review_title: reviews_title[key].trim(),
            review: reviews[key].trim(),
            date: dates[key].trim(),
          }
        }); // retorna a lista por página para cada loop para fora do contexto do browser para o contexto do node para a variavel list_per_page;
      });

      final_list = [...final_list, ...list_per_page]; // após cada loop em que o resultado final é um array com os dados de cada loop:[cada página], é mesclado os dados com os dados da página anterior;
    }

    return final_list; // retorna o array com os dados raspado após todos os loop's para a a variável que invocou a fn loop(); nesse caso a variável final_result na linha abaixo; 
  }

  console.time('fn time');
  const final_result = await loop();
  console.log(`finalizado em:`);
  console.timeEnd('fn time');

  const json = JSON.stringify(final_result, null, 2);
  
  const date = (new Date().toLocaleString().split(' ')[0]).replaceAll('/', '-');
  fs.writeFileSync(`${file_save_path}${file_name}-${date}.json`, json);
  console.log(`arquivo salvo com sucesso: [path]: ${file_save_path}${file_name}.json`);

  await browser.close();
};

cron.schedule('*/5 * * * *', collect, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});