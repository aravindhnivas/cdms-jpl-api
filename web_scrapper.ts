import axios from "axios";
import * as cheerio from "cheerio";
// import { JSDOM } from "jsdom";
import * as Bun from "bun";
import * as json2csv from "json2csv";
import TurndownService from "turndown";

const turndownService = new TurndownService();
// const markdown = turndownService.turndown("<h1>Hello world!</h1>");
// console.log(markdown);

async function htmlTableToCsv(url: string) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const table = $("table"); // Adjust this if needed
  let tableData = [];

  table.find("tr").each((index, row) => {
    let cols = {};
    $(row)
      .find("td")
      .each((i, col) => {
        cols[`col${i}`] = $(col).text().trim();
      });
    tableData.push(cols);
  });
  console.log("writing");
  await Bun.write("./table.json", JSON.stringify(tableData));
  const csv = json2csv.parse(tableData);
  await Bun.write("./output.csv", csv);
  console.log("done");
}

const URL = "https://cdms.astro.uni-koeln.de/classic/entries/";
// htmlTableToCsv(URL);
const tag = "038508".padStart(6, "0");
const entries_url = `https://cdms.astro.uni-koeln.de/cgi-bin/cdmsinfo?file=e${tag}.cat`;
const { data } = await axios.get(entries_url);
const $ = cheerio.load(data);
console.log($("td").text());
await Bun.write("./entries.txt", $("td").text());
// await Bun.write("./entries.html", $("td").html());

// const markdown = turndownService.turndown($("td").html());
// await Bun.write("./entries.md", markdown);
// console.log(markdown);
