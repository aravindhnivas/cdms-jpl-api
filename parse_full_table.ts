import axios from "axios";
import * as cheerio from "cheerio";
import * as Bun from "bun";
import * as json2csv from "json2csv";

const CDMS_URL = "https://cdms.astro.uni-koeln.de";
const fetch_cdms_url = async () => {
  console.log(`fetching data from ${CDMS_URL}`);
  const res = await axios.get(CDMS_URL + "/classic/entries");
  if (res.status !== 200) throw new Error("Failed to fetch data");
  return res.data;
};

const write_json_file = async (data: any, filename: string) => {
  console.log("writing json");
  await Bun.write(`./temp/${filename}.json`, JSON.stringify(data, null, 2));
  console.log(`wrote to ${filename}.json`);
};

export async function get_cdms_data(data: string, filename: string = "cdms_data", write_json: boolean = true) {
  if (!data) throw new Error("No data provided");
  const $ = cheerio.load(data);

  let tableData = [];
  console.log("parsing table");

  const columns: string[] = [];
  $("th").each((index, column) => {
    const header_name = $(column).text().trim().replace("–", "-");
    if (header_name) columns.push(header_name);
  });

  $("table")
    .find("tr")
    .each((index, row) => {
      let cols: Record<string, string> = {};
      $(row)
        .find("td")
        .each((i, col) => {
          if (!(columns[i] === "Catalog" || columns[i] === "Entry in cm-1" || columns[i] === "Documentation")) {
            const val = $(col).text().trim().replace("–", "-");
            cols[columns[i]] = val;
          }
        });
      tableData.push(cols);
    });
  console.log("finished fetching data");
  if (write_json) {
    await write_json_file(tableData, filename);
  }
  return tableData;
}

export async function html_to_csv(data: string[], filename: string = "output.csv") {
  console.log("converting to csv");
  const csv = json2csv.parse(data);
  console.log("writing csv");
  await Bun.write(`./temp/${filename}.csv`, csv);
  console.log(`wrote to ${filename}.csv`);
}

try {
  const cdms_html = await fetch_cdms_url();
  console.log("fetched data");
  const cdms_data = await get_cdms_data(cdms_html);
  html_to_csv(cdms_data, "cdms_data");
} catch (error) {
  console.warn(error);
}
