import axios from "axios";
import * as cheerio from "cheerio";
import * as Bun from "bun";
import * as json2csv from "json2csv";

async function get_cdms_data() {
  const url = "https://cdms.astro.uni-koeln.de/classic/entries/";

  console.log("fetching data");
  const { data } = await axios.get(url);
  console.log("parsing data");
  const $ = cheerio.load(data);

  const table = $("table"); // Adjust this if needed
  let tableData = [];
  console.log("parsing table");

  const columns: string[] = [];
  $("th").each((index, column) => {
    const header_name = $(column).text().trim().replace("–", "-");
    if (header_name) columns.push(header_name);
  });
  // console.log(columns);
  // return;
  table.find("tr").each((index, row) => {
    let cols = {};
    $(row)
      .find("td")
      .each((i, col) => {
        // cols[`col${i}`] = $(col).text().trim();
        cols[columns[i]] = $(col).text().trim().replace("–", "-");
      });
    tableData.push(cols);
  });
  console.log("finished fetching data");
  return tableData;
}

async function html_to_csv(data: string[], filename: string = "output.csv") {
  console.log("writing json");
  await Bun.write(`./temp/${filename}.json`, JSON.stringify(data));
  console.log(`wrote to ${filename}.json`);

  console.log("converting to csv");
  const csv = json2csv.parse(data);
  console.log("writing csv");
  await Bun.write(`./temp/${filename}.csv`, csv);
  console.log(`wrote to ${filename}.csv`);
}

const cdms_data = await get_cdms_data();
console.log(cdms_data.length);
// html_to_csv(cdms_data, "cdms_data");
