const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');
const {Builder, By, Key, until} = require('selenium-webdriver');
const fs = require('fs')
const cheerio = require('cheerio')
const Entities = require('html-entities').XmlEntities
const entities = new Entities();
let SongScrapy = require('./SongScrapy')

//windows size 参数
const width = 1080;
const height = 1920;

module.exporpts = ListScrapy;

/**
 * baseUrl 是获取榜单的入口
 * baseDir 是存取文件的base地址
 * refer 是 netEase 的网址
 * 因为这个爬虫只能爬取网易云
 * 所以就写死了
 * songLists 保存获取的榜单名以及 href
 * @param baseUrl
 * @param baseDir
 * @constructor
 */
function ListScrapy(baseUrl, baseDir) {
    this.self = this;
    this.baseUrl = baseUrl;
    this.baseDir = baseDir;
    this.refer = 'https://music.163.com/';
    this.songLists = [];

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
 * 将得到的网页 source 交给 getLists 处理
 * 得到榜单的名字以及 href
 */
ListScrapy.prototype.run = function () {
    this.driver.get(this.baseUrl)
        .then(_ => {
            //switchTo().frame 是必须的操作
            //如果没有这一步，很可能得到的是没有渲染的网页
            this.driver.switchTo().frame('g_iframe');
            this.driver.wait( () => {
                this.driver.getPageSource().then( (source) => {
                    this.getLists(source);
                });
                return true;
            },5000);
        })
}

/**
 *
 * @param html
 * 将传过来的网页解析
 * 得到每一个榜单的名字以及地址
 */
ListScrapy.prototype.getLists = function (html) {
    let $ = cheerio.load(html);

    //所有榜单都在 class="name" 下
    //lists 不能遍历，所以采用的是正则分割
    let lists = $('.name')

    // entities 的作用是将中文乱码重新编码
    // 出现中文乱码的原因不是网页编码集不是'utf-8'
    // 而是我们直接对topList 直接使用了 ToString 方法
    let listsStr = entities.decode(lists.toString())
    let listArr = listsStr.match(/<p class="name"><a .{0,80}p>/g);

    //对每一个 class="name" 的p标签进行遍历
    //提取出 href 和 name
    for(list of listArr){
        let listObj = {}
        let elementA = $(list);
        listObj.href = elementA.find('a').attr('href');
        listObj.name = elementA.text();
        this.songLists.push(listObj);
        console.log(listObj)
        let songScrapy = new SongScrapy(this.refer + listObj.href, this.baseDir + listObj.name);
        songScrapy.getSource();
    }
}

function test(){
    let netEaseScrapy = new ListScrapy('https://music.163.com/#/discover/toplist', './netEaseLists/');
    netEaseScrapy.run()
}

test()