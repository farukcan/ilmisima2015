var 
 ayar = require("./ayar.js"), //ayarlar burda
 wi = require("./wi.js"), // kitap ağırlıkları
 http = require('http'), //http protokolune ata
 mysql = require('mysql'),
 hexbin = require("./sayfalar/js/hexbin");
 fs = require('fs-extra'); // mysqli yükle

eval(fs.readFileSync('sayfalar/js/hexbin.js')+'');
eval(fs.readFileSync('sayfalar/karakteristik.js')+'');

ctt("ilmisima v1 e başlatılıyor");



  /*
  |--------------------------------------------------------------------------
  | MySQL Veritabanı
  |--------------------------------------------------------------------------
  |
  | 
  */

var sql = mysql.createConnection(ayar.mysql); // bağlantı oluştur

sql.connect(); //bağlan

  /*
  |--------------------------------------------------------------------------
  | http sunucu
  |--------------------------------------------------------------------------
  |
  | 
  */
var sunucu = http.createServer(function(istek,cevap){
    ct("istenen url : " + istek.url);

    switch (istek.url){
        case "":
            istek.url="/index.html";
        case "/":
            istek.url="/index.html";

        default:
        fs.readFile("./sayfalar" + istek.url,function(hata,veri){
            if(hata){ // dosya okunamazsa
                if(istek.url.indexOf("/avatar")==0){
                    cevap.writeHead(200,{"Content-type":"text/html"}); // html sayfası
                    cevap.end(fs.readFileSync("./sayfalar/img/yok_mini.jpg"));
                }else{
                    cevap.writeHead(404,{
                        "Content-type":"text/plain"
                    }); // head
                    cevap.end("404 NOT FOUND");
                }
            }
            else{
                if(istek.url.indexOf(".css")>-1)
                    cevap.writeHead(200,{"Content-type":"text/css"}); // html sayfası
                else
                    cevap.writeHead(200,{"Content-type":"text/html"}); // html sayfası
                cevap.end(veri);
            }
        });
    }
});

// http dinlemeyi başlat
sunucu.listen(ayar.port, function(){
  c('port *:'+ayar.port);
});


  /*
  |--------------------------------------------------------------------------
  | Konsol kısaltma fonksiyonları
  |--------------------------------------------------------------------------
  |
  | 
  */
    function c(tt){console.log(tt);}
    function ct(tt){console.log("# > "+tt);}
    function ctt(tt){c("# ----------");ct(tt);c("# ----------")}


  /*
  |--------------------------------------------------------------------------
  | Kendini yeniden başlatma farkındalığı
  |--------------------------------------------------------------------------
  |
  | 
  */

  fs.watchFile("app.js",function(shuanki,xonceki){
    ctt("Kaynak Kod Değişti, kapatılıyor...");
    kapat();
    
  });

  function kapat () {
    process.exit(1);
    throw new Error("YZ kapatıldı");
  }


/*
 |--------------------------------------------------------------------------
 | Yapay sinir ağları için fonksiyonlar
 |--------------------------------------------------------------------------
 |
 |
 */
    function toplam(x,w){
        var toplam=0;
        for(key in w){
            toplam+=w[key]*x[key];
        }
        return toplam;
    }

    function sign(x){
        if(x==0) return 0;
        if(x>0) return 1;
        return -1;
    }

/*
 |--------------------------------------------------------------------------
 | kitap kişiliği hesaplayıcı
 |--------------------------------------------------------------------------
 |
 |
 */

    function calcKitap(kisilikARR){
        var s = [];
        var k= [];

        karakteristlik.sonuc.forEach(function(e,i){
            s.push(sign(toplam(kisilikARR,wi[i])));
        });

        kisilikler.forEach(function(e,i){
            if(e.negatif==null)
                k.push(s[e.pozitif]);
            else
                k.push(s[e.pozitif]-s[e.negatif]);
        });

        return k;
    }

/*
 |--------------------------------------------------------------------------
 | socket.io ve conn
 |--------------------------------------------------------------------------
 |
 |
 */
    var conn_index=0;
    var conn = []
    var ipList = [];
    function Conn(no,soket){
        this.no = no;
        this.soket = soket;
        this.ip = "yok";
        this.setIp = function (ip) {
            this.ip = ip;
            if(!ipList[this.ip]) ipList[this.ip] = 1;
        };
        this.isFeedAble = function(){
            if(!ipList[this.ip]) ipList[this.ip] = 1;
            if(ipList[this.ip] > 100) return false;

            ipList[this.ip]++;
            return true;
        };
        this.uyumlu = false;
        this.waitTime = 0;
        this.wait= function (s) {
            this.waitTime = Date.now()+s;
        };
        this.isReady = function(){
            return Date.now()>this.waitTime;
        }
    }


    io = require('socket.io')(sunucu);

    io.on('connection',function (socket){
        var conn_no = conn_index++;
        conn[conn_no] = new Conn(conn_no,socket);
        socket.conn = conn[conn_no];
        socket.conn.setIp(socket.handshake.address);
        c("["+conn_no+"] Connected : "+socket.conn.ip);
        //
        // soket komutları
        //
        socket.on('disconnect', function(neden){
            c("["+conn_no+"] Disconnected : "+socket.conn.ip);
            socket.conn=null;
            conn[conn_no]=null;
            delete socket.conn;
            delete conn[conn_no];
        });
        socket.on("version",function (dat) {
            c("Client version : " +dat);
            socket.emit('hi');
            if(dat!=ayar.client.version)
                return socket.emit("hata","Uygulamanız güncel değil, lütfen güncelleyin!");

            socket.conn.uyumlu = true;

        });
        socket.on('send',function(dat){
            if(socket.conn.isReady()){
                try{
                    socket.emit("sonuc",calcKitap(toBIN(dat,karakteristlik.ozellik.length).split('')));
                }catch(e){
                    c(e);
                    socket.emit("hata","Sunucu tarafında hata tespit edildi!");
                }
                socket.conn.wait(5000);
            }else  return socket.emit("hata","Üst üste sunucuya karakter verisi gönderilemez. 5sn bekleyin!");


        });

        socket.on('feedback',function(d){
            try{
                if( socket.conn.uyumlu
                    && (d.karakter.length==Math.ceil(karakteristlik.ozellik.length/4))
                    && (toHEX(toBIN(d.karakter,karakteristlik.ozellik.length))==d.karakter)
                    && d.kisilikno>=0 && d.kisilikno<kisilikler.length
                    && (d.deger==1 || d.deger==-1 || d.deger==0)) {

                        if(socket.conn.isFeedAble()){
                            var q = 'INSERT INTO feedback VALUES (TIMESTAMP(NOW()),?,?,?,?,?);';
                            sql.query(q,[socket.conn.ip, d.karakter, d.kisilikno, d.deger,ayar.sistem.version], function(err, results) {
                                c(err);c(results);
                            });
                        }else return socket.emit("hata","çok fazla geri bildirim!!");


                }else return socket.emit("hata","Geribildirim de hata oluştu!");
            }catch (e){
                c(e);
                return socket.emit("hata","Geribildirim de hata oluştu!");
            }

        });

    });


