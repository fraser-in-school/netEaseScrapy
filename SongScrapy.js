const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const {Builder, By, Key, until} = require('selenium-webdriver');
const fs = require('fs')
const cheerio = require('cheerio')
const Entities = require('html-entities').XmlEntities
const entities = new Entities();

const width = 1080;
const height = 1920;

module.exports = SongScrapy;

/**
 * 用于爬取特定歌单页
 * @param href
 * @param name
 * @constructor
 */
function SongScrapy(href, name) {
    this.url = href;
    this.name = name;
    this.self = this;
    // 使用Chromedriver, 只支持 75 及以下的版本
    // 运行如果报错说缺少驱动，按着他提供的链接下载即可
    // 不过driver需要暴露在系统路径下
    this.driver = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(
            new chrome.Options().headless().windowSize({width, height}))
        .setFirefoxOptions(
            new firefox.Options().headless().windowSize({width, height}))
        .build();
}

/**
 * 将前面获得榜单名字以及 href
 * 继续抓取，得到mei每个歌单的网页
 * @param href
 * @param name
 */
SongScrapy.prototype.getSource = function(){
    this.driver.get(this.url)
        .then(_ => {
            //switchTo().frame 是必须的操作
            //如果没有这一步，很可能得到的是没有渲染的网页
            this.driver.switchTo().frame('g_iframe');
            this.driver.wait( () => {
                this.driver.getPageSource().then( (source) => {
                    this.getTopList(source, this.name);
                });
                return true;
            },5000);
        })
}

SongScrapy.prototype.getTopList = function (html, name) {
    let $ = cheerio.load(html);
    let topList = $('#song-list-pre-cache');
    /**
     * 直接查找的话，转为text中间会
     * 夹杂一些无关字符
     */
    // topList.find('tr').each(function (songItem) {
    //     let songName = $(this).find('.txt').find('')
    //     console.log('txt', songName.text())
    // })

    //使用正则表达式来查找歌名
    /**
     * 得到的item类似这样
     * <span data-res-id="1377870311" data-res-type="18"
     * data-res-action="share" data-res-name="山上雪"
     * data-res-author="万象凡音/黄诗扶"
     * data-res-pic="http://p2.music.126.net/8C0LCrwm-BG3iNtWNFHqFw==/109951164212877338.jpg"
     * class="icn icn-share" title="分享">分享</span>
     */
        // entities 的作用是将中文乱码重新编码
        // 出现中文乱码的原因不是网页编码集不是'utf-8'
        // 而是我们直接对topList 直接使用了 ToString 方法
    let listString = entities.decode(topList.toString());
    //正则提取
    let songs = listString.match(/<span data-res-id="\d{0,40}" data-res-type=".{0,20}" data-res-action=".{0,20}" data-res-name=".{0,100}" data-res-author=".{0,100}".{0,300}" class=".{0,70}" title.{0,100}<\/span>/g)
    //对于每首歌提取出我们需要的信息
    console.log('length', songs.length)
    // 得到真正的文件名
    let filename = `${this.name}-${songs.length}.json`;

    // 如果文件已经存在，则删除文件
    if(fs.existsSync(filename)){
        fs.unlink(filename, (err) => {
            if(err){
                return console.log(err);
            }else{

            }
        })
    }
    for(let song of songs){
        let songItem = $(song);
        //将我们需要的信息提取出来
        let songName = songItem.attr('data-res-name')
        let songAuthor = songItem.attr('data-res-author')
        let songId =songItem.attr('data-res-id');
        let songObj = {
            name: songName,
            author: songAuthor,
            id: songId,
        }
        //转为json
        let jsonStr = JSON.stringify(songObj) + ',';
        //console.log(jsonStr)
        fs.appendFileSync(filename, jsonStr);
    }
}
//
// function test() {
//     let songScrapy = new SongScrapy('https://music.163.com/#/discover/toplist?id=19723756', './netEaseLists/云音乐飙升榜');
//     songScrapy.getSource();
// }
//
// test();