import * as Bun from "bun";
import axios from "axios";
import * as cheerio from "cheerio";

function endash_str(str: string) {
  return str.replaceAll("–", "-").trim();
}

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
    // const value = $(arr.lastChild).text().trim();
    let value: string | string[] = "";

    if (key === "Contributor") {
      if ($(arr.lastChild).html()?.includes("<br>")) {
        value = $(arr.lastChild).html()?.split("<br>");
      } else {
        value = [endash_str($(arr.lastChild).text().trim())];
      }
    } else {
      value = endash_str($(arr.lastChild).text().trim());
    }
    full_info[endash_str(key)] = value;
  }

  for (const element of ref_element.toArray()) {
    let ref = $(element).text();
    ref = ref.replaceAll(/(\(\d\))/g, "").trim();
    ref = ref.replaceAll("\n", " ").replaceAll("  ", " ");
    references.push(endash_str(ref));
  }

  const heading = $("caption font:not([color='red'])");

  const [name_formula, ...name_formula_meta] = heading.text()?.trim()?.split(/[, ]/g);
  const [name_html, ...name_html_meta] = heading.html()?.split(/[, ]/g) ?? "";

  const iupac_name = $("caption").text().split("\n")[1].split(/[,;]/g)[0];
  const [, ...name_meta] =
    $("caption")
      .html()
      ?.split("\n")[1]
      .split(/[,;]/g)
      .map((f) => endash_str(f.trim())) ?? [];

  const name = {
    default: endash_str(iupac_name),
    meta: name_meta.join(", "),
    formula: {
      default: endash_str(name_formula),
      meta: endash_str(name_formula_meta.join(" ").replaceAll("  ", ", ")),
    },
    html: {
      default: endash_str(name_html),
      meta: endash_str(name_html_meta.join(" ").replaceAll("  ", ", ")),
    },
  };
  const processed_informations = { name, ...full_info, references };
  await Bun.write("./full_info.json", JSON.stringify(processed_informations, null, 2));
  return processed_informations;
}

main("013505");
