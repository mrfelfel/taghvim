let express = require("express");
let app = express();
let moment = require('moment');
let momentj = require('moment-jalaali');
let shamsi = require("./shamsi");
app.use('/', express.static('public'));
function shamsiE(date) {
    if (shamsi[date]) {
        return shamsi[date]
    } else {
        return null
    }
}
let m = momentj();
let resjson = function(m){
           var resjes = {
        "date": m.format('YYYY/MM/DD'),
        "jdate": m.format('jYYYY/jMM/jDD'),
        "event": shamsiE(m.format('jMM/jDD')),
        "week": m.locale("fa").format("dddd")
       }
     return resjes;
    }
app.get("/time", function(req, res) {
    res.send(moment().format('LTS'));
});
app.get("/date", function(req, res) {

    res.json(resjson(m));
});

app.get("/jashn/:year/:name",function(req,res){
             var evmet  = momentj(req.params.year, 'jYYYY-jMM-jDD');
      for(let m in shamsi){
           var regex = new RegExp(req.params.name , "g");
          if(shamsi[m].match(regex)){
            m  = momentj(req.params.year + "/" + m, 'jYYYY/jMM/jDD');
                 res.send(resjson(m));
            }
     }
 });

app.get("/date/:from", function(req, res) {






     m = momentj(req.params.from, 'jYYYY-jMM-jDD');
      if(m.isValid()){
    res.json(resjson(m));
   }else{
       res.send("خطا تاریخ نامعتبر است");
  }
});
app.get("/to/:type/:from", function(req, res) {
    if (req.params.type == "jalali") {
        m = momentj(req.params.from, 'YYYY-MM-DD');
    } else if (req.params.type == "gregorian") {
        m = momentj(req.params.from, 'jYYYY-jMM-jDD');
    }
    res.json(resjson(m));
});
app.listen('4050', function(err) {
    if (!err) {
        console.log("ok server started");
    }
});
