import * as Bun from "bun";
import axios from "axios";
import * as cheerio from "cheerio";
import gs from "googlescholar-scrape";

const tag = "005502".padStart(6, "0");
const entries_url = `https://cdms.astro.uni-koeln.de/cgi-bin/cdmsinfo?file=e${tag}.cat`;

const { data } = await axios.get(entries_url);
const $ = cheerio.load(data);
const ref_element = $('p font[color="#064898"]');
const references: string[] = [];

// console.log(gs);
for (const element of ref_element.toArray()) {
  let ref = $(element).text();
  ref = ref.replaceAll(/(\(\d\))/g, "").trim();
  ref = ref.replaceAll("\n", " ").replaceAll("  ", " ");
  references.push(ref);
}
const p_elements = $("td[colspan='2'] p[align='justify']").children().not("font[color='#064898']");

let contents: string[] = [];
p_elements.each((index, element) => {
  contents.push($(element).text());
});

// const p_text = $("p").text();
console.log({ contents });

// const ind = 0;
// console.log(references[ind]);
// console.log(await gs.search(references[ind]));

const qpart = {};

const keys = [
  "Lines Listed",
  "Frequency / GHz",
  "Max. J",
  "log STR0",
  "log STR1",
  "Isotope Corr.",
  "Egy / (cm-1)",
  "µa / D",
  "µb / D",
  "µc / D",
  "A / MHz",
  "B / MHz",
  "C / MHz",
  "detected in ISM/CSM",
];

const metakeys = ["Species tag", "Version", "Date of Entry", "Contributor"];
const values = {};
const meta = {};

const str = $("td").text();
const splitLines = str.split("\n");

for (let line of splitLines.slice(0, splitLines.length - 1)) {
  line = line.trim();
  for (const key of keys) {
    if (line.includes(key) && !values[key]) {
      const [, splitLine] = line.split(key);
      values[key] = splitLine.trim();
    }
  }

  for (const mkey of metakeys) {
    if (line.includes(mkey) && !meta[mkey]) {
      const [, splitLine] = line.split(mkey);
      meta[mkey] = splitLine.trim();
    }
  }

  if (line.startsWith("Q(") && line.match(/Q\((\d+(\.\d*)?)\)/g)) {
    const [key, ...value] = line.split(")");
    const joined_val = value.join("");
    qpart[key.replaceAll(/(Q\()/g, "")] = joined_val + (joined_val.includes("(") ? ")" : "");
  }
}
const heading = $("caption font:not([color='red'])");
// console.log(heading.html());

const name_formula = heading.text()?.trim()?.split(",")[0];
const name_html = heading.html()?.split(",")[0];
// console.log(heading.html());
// const caption = $("caption").text().split("\n")[1];
// const [iupac_name, ...name_meta] = caption.split(",");
const iupac_name = $("caption").text().split("\n")[1].split(",")[0];
const [, ...name_meta] =
  $("caption")
    .html()
    ?.split("\n")[1]
    .split(",")
    .map((f) => f.trim()) ?? [];
await Bun.write("./parsed.json", JSON.stringify({ name: { default: iupac_name, meta: name_meta, formula: name_formula, html: name_html }, qpart, values, meta, references }, null, 2));
