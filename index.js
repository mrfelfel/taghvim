const express = require("express");
const moment = require("moment-jalaali");
const shamsi = require("./shamsi");

const app = express();
const PORT = 4050;

moment.loadPersian({ dialect: "persian-modern" });

app.use(express.static("public"));

/* ------------------ Utils ------------------ */

const getShamsiEvent = (jDateKey) => shamsi[jDateKey] || null;

const buildResponse = (m) => ({
  date: m.format("YYYY/MM/DD"),
  jdate: m.format("jYYYY/jMM/jDD"),
  event: getShamsiEvent(m.format("jMM/jDD")),
  week: m.locale("fa").format("dddd"),
});

const invalidDate = (res) =>
  res.status(400).json({ error: "تاریخ نامعتبر است" });

/* ------------------ Routes ------------------ */

app.get("/time", (req, res) => {
  res.send(moment().format("LTS"));
});

app.get("/date", (req, res) => {
  const m = moment();
  res.json(buildResponse(m));
});

app.get("/date/:from", (req, res) => {
  const m = moment(req.params.from, "jYYYY-jMM-jDD", true);
  if (!m.isValid()) return invalidDate(res);
  res.json(buildResponse(m));
});

app.get("/to/:type/:from", (req, res) => {
  const { type, from } = req.params;

  let m;
  if (type === "jalali") {
    m = moment(from, "YYYY-MM-DD", true);
  } else if (type === "gregorian") {
    m = moment(from, "jYYYY-jMM-jDD", true);
  } else {
    return res.status(400).json({ error: "type نامعتبر است" });
  }

  if (!m.isValid()) return invalidDate(res);
  res.json(buildResponse(m));
});

app.get("/jashn/:year/:name", (req, res) => {
  const { year, name } = req.params;
  const regex = new RegExp(name, "i");

  for (const key in shamsi) {
    if (regex.test(shamsi[key])) {
      const m = moment(`${year}/${key}`, "jYYYY/jMM/jDD", true);
      if (!m.isValid()) continue;
      return res.json(buildResponse(m));
    }
  }

  res.status(404).json({ error: "جشنی با این نام پیدا نشد" });
});

/* ------------------ Server ------------------ */

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
