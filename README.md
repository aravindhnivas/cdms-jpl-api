## Getting Started

Get information from the JPL and CDMS databases by `molecule tag`.

To obtain data by single molecule tag, use the following code:

```ts
import axios from 'axios';
import { JPL, CDMS } from 'cdms-jpl-api';

// usage example
// first obtain the url data either by using node-fetch or axios or any other library to fetch the HTML data

// fetching HTML data from CDMS

const cdms_tag = '003501' // for HD
const cdms_url = `https://cdms.astro.uni-koeln.de/cgi-bin/cdmsinfo?file=e${tag}.cat`;
const res = await axios.get(cdms_url);
const res = await axios.get(cdms_url);
const html_data = res.data;
const parsed_informations = await CDMS(jpl_html);

// similiar approach for JPL but use the corresponsing URL
const jpl_tag = '3001' // for HD
const jpl_url = `https://spec.jpl.nasa.gov/ftp/pub/catalog/doc/d${jpl_tag}.cat`;
```

To obtain the full data table from the JPL and CDMS databases, use the following code:

```ts
import { parse_cdms_data, parse_jpl_data } from 'cdms-jpl-api';

const cdms_html = await fetch_data_from_url('CDMS');
const cdms_data = await parse_cdms_data(cdms_html);

```

## License

MIT
