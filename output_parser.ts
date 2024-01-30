import * as Bun from "bun";
import axios from "axios";
import * as cheerio from "cheerio";
import gs from "googlescholar-scrape";

async function main(tag: string = "005502") {
  tag = tag.padStart(6, "0");
  const entries_url = `https://cdms.astro.uni-koeln.de/cgi-bin/cdmsinfo?file=e${tag}.cat`;

  const { data } = await axios.get(entries_url);
  const $ = cheerio.load(data);
  const ref_element = $('p font[color="#064898"]');
  const references: string[] = [];

  // console.log("\n\nscraping references\n\n");
  const td_val = $("td[align='right']");
  const td_parent = td_val.parent();

  const full_info = {};
  for (const arr of td_parent.toArray()) {
    const key = $(arr?.firstChild).text().trim();
    const value = $(arr.lastChild).text().trim();
    full_info[key] = value;
    // console.log({ key, value });
  }

  for (const element of ref_element.toArray()) {
    let ref = $(element).text();
    ref = ref.replaceAll(/(\(\d\))/g, "").trim();
    ref = ref.replaceAll("\n", " ").replaceAll("  ", " ");
    references.push(ref);
  }

  const heading = $("caption font:not([color='red'])");
  // console.log(heading.html());

  const name_formula = heading.text()?.trim()?.split(",")[0];
  const name_html = heading.html()?.split(",")[0];

  const iupac_name = $("caption").text().split("\n")[1].split(/[,;]/g)[0];
  const [, ...name_meta] =
    $("caption")
      .html()
      ?.split("\n")[1]
      .split(/[,;]/g)
      .map((f) => f.trim()) ?? [];
  const name = { default: iupac_name, meta: name_meta, formula: name_formula, html: name_html };
  const processed_informations = { name, ...full_info, references };

  await Bun.write("./full_info.json", JSON.stringify(processed_informations, null, 2));
  return processed_informations;
}

main("005502");
