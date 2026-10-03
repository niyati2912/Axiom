export const esc = (s) =>
  String(s ?? "")
    .replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));


export const pct = (x, d = 1) =>
  x == null
    ? "—"
    : `${(x * 100).toFixed(d)}%`;


export const int = (x) =>
  x == null
    ? "—"
    : Math.round(x).toLocaleString("en-US");


export const money = (x) =>
  x == null
    ? "—"
    : "$" + Math.round(x).toLocaleString("en-US");


export const fixed = (x, d = 2) =>
  x == null
    ? "—"
    : Number(x).toFixed(d);


export const label = (s) =>
  esc(
    String(s ?? "")
      .replace(/_/g, " ")
  );


export const featureLabel = (f) => {

  if (f === "week1_feature_count") {
    return "Week-1 features used";
  }

  if (f === "had_week1_ticket") {
    return "Week-1 support ticket";
  }

  return String(f)
    .replace(/^channel_/, "Channel: ")
    .replace(/^company_size_/, "Size: ")
    .replace(/_/g, " ");

};


export function panel(
  title,
  subtitle,
  body,
  { flush = false, accent = false } = {}
) {

  return `
    <section class="panel ${flush ? "flush" : ""} ${accent ? "accent-panel" : ""}">

      <header class="panel-header">

        <div>

          <h2>
            ${esc(title)}
          </h2>

          ${
            subtitle
              ? `<p>${esc(subtitle)}</p>`
              : ""
          }

        </div>

        ${
          accent
            ? `<span class="panel-signal">FLOWDESK SIGNAL</span>`
            : ""
        }

      </header>

      <div class="body">

        ${body}

      </div>

    </section>
  `;

}


export function kpi(
  labelText,
  value,
  sub = ""
) {

  return `
    <div class="kpi">

      <div class="kpi-top">

        <span class="label">
          ${esc(labelText)}
        </span>

        <span class="kpi-dot"></span>

      </div>

      <div class="value">
        ${value}
      </div>

      ${
        sub
          ? `<div class="sub">${esc(sub)}</div>`
          : ""
      }

    </div>
  `;

}


export const badge = (v) => `
  <span class="badge ${esc(v)}">
    ${label(v)}
  </span>
`;


export const note = (t) => `
  <p class="note">
    ${esc(t)}
  </p>
`;


export function table(
  cols,
  rows,
  {
    onRowAttr,
    sortKey,
    sortDir
  } = {}
) {

  const head = cols
    .map((c) => `
      <th
        class="${c.num ? "num" : ""} ${c.sortKey ? "sortable" : ""}"
        ${
          c.sortKey
            ? `data-sort="${c.sortKey}"`
            : ""
        }
      >
        ${esc(c.label)}

        ${
          c.sortKey &&
          c.sortKey === sortKey
            ? sortDir === "desc"
              ? " ▾"
              : " ▴"
            : ""
        }

      </th>
    `)
    .join("");


  const body = rows
    .map((r) => `
      <tr ${onRowAttr ? onRowAttr(r) : ""}>

        ${cols
          .map((c) => `
            <td class="${c.num ? "num" : ""}">
              ${
                c.render
                  ? c.render(r)
                  : esc(r[c.key])
              }
            </td>
          `)
          .join("")}

      </tr>
    `)
    .join("");


  return `
    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            ${head}
          </tr>
        </thead>

        <tbody>

          ${
            body ||
            `
              <tr>
                <td colspan="${cols.length}">
                  <div class="empty">
                    No matching data
                  </div>
                </td>
              </tr>
            `
          }

        </tbody>

      </table>

    </div>
  `;

}


export function select(
  id,
  labelText,
  options,
  value = ""
) {

  return `
    <label class="field">

      <span>
        ${esc(labelText)}
      </span>

      <select id="${id}">

        ${options
          .map(
            ([v, l]) => `
              <option
                value="${esc(v)}"
                ${v === value ? "selected" : ""}
              >
                ${esc(l)}
              </option>
            `
          )
          .join("")}

      </select>

    </label>
  `;

}


export function callout(
  title,
  text,
  next,
  page
) {

  return `
    <article class="insight-card">

      <div class="insight-card-top">

        <span class="insight-badge">
          FLOWDESK SIGNAL
        </span>

        <span class="insight-number">
          ✦
        </span>

      </div>

      <h3>
        ${esc(title)}
      </h3>

      <p>
        ${esc(text)}
      </p>

      <div class="insight-next">

        <span>INVESTIGATE</span>

        ${esc(next)}

      </div>

      ${
        page
          ? `
            <a
              class="insight-link"
              href="#/workspace/${esc(page)}"
            >
              Explore signal
              <span>→</span>
            </a>
          `
          : ""
      }

    </article>
  `;

}


export const grid = (
  cls,
  ...items
) => `
  <div class="grid ${cls}">
    ${items.join("")}
  </div>
`;