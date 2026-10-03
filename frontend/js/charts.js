import { esc } from "./ui.js";


export const COLORS = [
  "var(--c1)",
  "var(--c2)",
  "var(--c3)",
  "var(--c4)",
  "var(--c5)"
];


const tip = () =>
  document.getElementById("tooltip");


function showTip(html, e) {

  const t = tip();

  if (!t) return;

  t.innerHTML = html;

  t.hidden = false;

  const w = t.offsetWidth;

  t.style.left =
    Math.min(
      e.clientX + 14,
      window.innerWidth - w - 8
    ) + "px";

  t.style.top =
    e.clientY + 14 + "px";

}


const hideTip = () => {

  const t = tip();

  if (t) {
    t.hidden = true;
  }

};


function niceTicks(
  min,
  max,
  count = 5
) {

  if (min === max) {
    max = min + 1;
  }

  const raw =
    (max - min) / count;

  const mag =
    10 ** Math.floor(
      Math.log10(raw)
    );

  const step =
    [1, 2, 2.5, 5, 10]
      .map((m) => m * mag)
      .find((s) => s >= raw);

  const start =
    Math.floor(min / step) * step;

  const out = [];

  for (
    let v = start;
    v <= max + step * .5;
    v += step
  ) {

    out.push(
      +v.toFixed(10)
    );

  }

  return out;

}


function mount(el, draw) {

  const render = () => {

    const width =
      el.clientWidth || 600;

    el.innerHTML =
      draw(width);

    el.__bind?.();

  };

  render();

  let last =
    el.clientWidth;

  if (typeof ResizeObserver !== "undefined") {

    const ro =
      new ResizeObserver(() => {

        if (
          Math.abs(
            el.clientWidth - last
          ) > 4
        ) {

          last =
            el.clientWidth;

          render();

        }

      });

    ro.observe(el);

  }

}


export const chartBox =
  (id, height = 280) =>
    `
      <div
        class="chart"
        id="${id}"
        style="min-height:${height}px"
      ></div>
    `;


/* =========================================================
   LINE CHART
========================================================= */

export function lineChart(
  el,
  series,
  opts = {}
) {

  const {
    height = 280,
    yFmt = (v) => v,
    xFmt = (v) => v,
    step = false,
    xLabel = "",
    categories
  } = opts;

  const all =
    series.flatMap(
      (s) => s.points
    );

  if (!all.length) {

    el.innerHTML =
      `<div class="empty">No data</div>`;

    return;

  }

  const xs =
    [
      ...new Set(
        all.map(
          (p) => p.x
        )
      )
    ].sort(
      (a, b) => a - b
    );


  mount(el, (W) => {

    const m = {
      l: 48,
      r: 12,
      t: 10,
      b: xLabel ? 40 : 26
    };

    const iw =
      W - m.l - m.r;

    const ih =
      height - m.t - m.b;

    const xmin = xs[0];

    const xmax =
      xs[xs.length - 1];

    const ys =
      all
        .flatMap(
          (p) => [
            p.y,
            p.lo,
            p.hi
          ]
        )
        .filter(
          (v) => v != null
        );

    const yLo =
      opts.yMin ??
      Math.min(0, ...ys);

    const yHi =
      opts.yMax ??
      Math.max(...ys);

    const yt =
      niceTicks(
        yLo,
        yHi
      );

    const y0 = yt[0];

    const y1 =
      yt[yt.length - 1];

    const sx = (v) =>
      m.l +
      (
        xmax === xmin
          ? iw / 2
          : (
            (v - xmin) /
            (xmax - xmin)
          ) * iw
      );

    const sy = (v) =>
      m.t +
      ih -
      (
        (v - y0) /
        (y1 - y0 || 1)
      ) * ih;


    const xt =
      categories

        ? xs.filter(
            (_, i) =>
              i %
              Math.ceil(
                xs.length / 8
              ) === 0
          )

        : niceTicks(
            xmin,
            xmax,
            6
          ).filter(
            (v) =>
              v >= xmin &&
              v <= xmax
          );


    let g = "";


    yt.forEach((v) => {

      const y =
        sy(v);

      g += `
        <line
          x1="${m.l}"
          x2="${W - m.r}"
          y1="${y}"
          y2="${y}"
          stroke="rgba(255,255,255,.055)"
        />

        <text
          x="${m.l - 7}"
          y="${y + 3}"
          text-anchor="end"
        >
          ${esc(yFmt(v))}
        </text>
      `;

    });


    xt.forEach((v) => {

      g += `
        <text
          x="${sx(v)}"
          y="${height - m.b + 15}"
          text-anchor="middle"
        >
          ${
            esc(
              categories
                ? categories[v]
                : xFmt(v)
            )
          }
        </text>
      `;

    });


    if (xLabel) {

      g += `
        <text
          x="${m.l + iw / 2}"
          y="${height - 4}"
          text-anchor="middle"
        >
          ${esc(xLabel)}
        </text>
      `;

    }


    series.forEach(
      (s, i) => {

        const c =
          s.color ||
          COLORS[
            i % COLORS.length
          ];

        const pts =
          s.points;


        if (
          pts.some(
            (p) =>
              p.lo != null
          )
        ) {

          const up =
            pts.map(
              (p) =>
                `${sx(p.x)},${sy(p.hi)}`
            );

          const dn =
            pts
              .slice()
              .reverse()
              .map(
                (p) =>
                  `${sx(p.x)},${sy(p.lo)}`
              );

          g += `
            <polygon
              points="${up.concat(dn).join(" ")}"
              fill="${c}"
              opacity=".10"
            />
          `;

        }


        let d = "";

        pts.forEach(
          (p, j) => {

            if (j === 0) {

              d +=
                `M${sx(p.x)},${sy(p.y)}`;

            } else if (step) {

              d +=
                `H${sx(p.x)}V${sy(p.y)}`;

            } else {

              d +=
                `L${sx(p.x)},${sy(p.y)}`;

            }

          }
        );


        g += `
          <path
            d="${d}"
            fill="none"
            stroke="${c}"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        `;


        if (pts.length <= 24) {

          g += pts
            .map(
              (p) => `
                <circle
                  cx="${sx(p.x)}"
                  cy="${sy(p.y)}"
                  r="2.5"
                  fill="${c}"
                />
              `
            )
            .join("");

        }

      }
    );


    el.__bind = () => {

      const svg =
        el.querySelector("svg");

      const guide =
        svg.querySelector(
          ".guide"
        );


      svg.onmousemove =
        (e) => {

          const rect =
            svg.getBoundingClientRect();

          const px =
            e.clientX -
            rect.left;

          const xv =
            xmin +
            (
              (px - m.l) /
              iw
            ) *
            (xmax - xmin);


          const nx =
            xs.reduce(
              (a, b) =>
                Math.abs(b - xv) <
                Math.abs(a - xv)
                  ? b
                  : a
            );


          guide.setAttribute(
            "x1",
            sx(nx)
          );

          guide.setAttribute(
            "x2",
            sx(nx)
          );

          guide.style.display =
            "";


          const rows =
            series
              .map(
                (s, i) => {

                  const p =
                    s.points
                      .filter(
                        (q) =>
                          q.x <= nx
                      )
                      .pop();

                  if (!p) {
                    return "";
                  }

                  return `
                    <div>
                      <span
                        style="
                          color:${
                            s.color ||
                            [
                              "#8274ff",
                              "#35d5d0",
                              "#f5b85b",
                              "#ff6f83",
                              "#b5aaff"
                            ][i % 5]
                          }
                        "
                      >
                        ■
                      </span>

                      ${esc(s.name)}:
                      ${esc(yFmt(p.y))}
                    </div>
                  `;

                }
              )
              .join("");


          showTip(
            `
              <b>
                ${
                  esc(
                    categories
                      ? categories[nx]
                      : xFmt(nx)
                  )
                }
              </b>

              ${rows}
            `,
            e
          );

        };


      svg.onmouseleave =
        () => {

          guide.style.display =
            "none";

          hideTip();

        };

    };


    const legend =
      series.length > 1
        ? `
          <div class="legend">

            ${
              series
                .map(
                  (s, i) => `
                    <span>

                      <i
                        style="
                          background:${
                            s.color ||
                            COLORS[i % 5]
                          }
                        "
                      ></i>

                      ${esc(s.name)}

                    </span>
                  `
                )
                .join("")
            }

          </div>
        `
        : "";


    return `
      ${legend}

      <svg
        width="${W}"
        height="${height}"
        role="img"
      >

        ${g}

        <line
          class="guide"
          y1="${m.t}"
          y2="${m.t + ih}"
          stroke="#657084"
          style="display:none"
        />

      </svg>
    `;

  });

}


/* =========================================================
   BAR CHART
========================================================= */

export function barChart(
  el,
  data,
  opts = {}
) {

  const {
    height = 240,
    yFmt = (v) => v,
    names = ["Value"],
    keys = ["value"]
  } = opts;


  if (!data.length) {

    el.innerHTML =
      `<div class="empty">No data</div>`;

    return;

  }


  mount(el, (W) => {

    const m = {
      l: 44,
      r: 8,
      t: 8,
      b: 28
    };

    const iw =
      W - m.l - m.r;

    const ih =
      height - m.t - m.b;


    const yt =
      niceTicks(
        0,
        Math.max(
          ...data.map(
            (d) =>
              Math.max(
                ...keys.map(
                  (k) =>
                    d[k] ?? 0
                )
              )
          ),
          1
        )
      );


    const y1 =
      yt[yt.length - 1];


    const gw =
      iw / data.length;

    const bw =
      Math.max(
        2,
        (
          gw * .7
        ) / keys.length
      );


    let g = "";


    yt.forEach(
      (v) => {

        const y =
          m.t +
          ih -
          (v / y1) * ih;

        g += `
          <line
            x1="${m.l}"
            x2="${W - m.r}"
            y1="${y}"
            y2="${y}"
            stroke="rgba(255,255,255,.055)"
          />

          <text
            x="${m.l - 6}"
            y="${y + 3}"
            text-anchor="end"
          >
            ${esc(yFmt(v))}
          </text>
        `;

      }
    );


    data.forEach(
      (d, i) => {

        keys.forEach(
          (k, j) => {

            const h =
              (
                (d[k] ?? 0) /
                y1
              ) * ih;

            const x =
              m.l +
              i * gw +
              gw * .15 +
              j * bw;


            g += `
              <rect
                x="${x}"
                y="${m.t + ih - h}"
                width="${bw - 1}"
                height="${h}"
                rx="2"
                fill="${COLORS[j % 5]}"
                data-tip="${esc(
                  d.label
                )}: ${esc(
                  names[j]
                )} ${esc(
                  yFmt(d[k] ?? 0)
                )}"
              />
            `;

          }
        );


        if (
          i %
          Math.ceil(
            data.length / 9
          ) === 0
        ) {

          g += `
            <text
              x="${
                m.l +
                i * gw +
                gw / 2
              }"
              y="${height - 8}"
              text-anchor="middle"
            >
              ${esc(d.label)}
            </text>
          `;

        }

      }
    );


    el.__bind = () => {

      el
        .querySelectorAll(
          "rect[data-tip]"
        )
        .forEach(
          (r) => {

            r.onmousemove =
              (e) =>
                showTip(
                  r.dataset.tip,
                  e
                );

            r.onmouseleave =
              hideTip;

          }
        );

    };


    const legend =
      keys.length > 1
        ? `
          <div class="legend">

            ${
              names
                .map(
                  (n, i) => `
                    <span>

                      <i
                        style="
                          background:
                          ${COLORS[i % 5]}
                        "
                      ></i>

                      ${esc(n)}

                    </span>
                  `
                )
                .join("")
            }

          </div>
        `
        : "";


    return `
      ${legend}

      <svg
        width="${W}"
        height="${height}"
      >
        ${g}
      </svg>
    `;

  });

}


/* =========================================================
   HORIZONTAL BARS
========================================================= */

export function hbars(
  rows,
  {
    max,
    color
  } = {}
) {

  const mx =
    max ??
    Math.max(
      ...rows.map(
        (r) => r.value
      ),
      1e-9
    );


  return `
    <div class="hbars">

      ${
        rows
          .map(
            (r) => `
              <div class="hbar">

                <div
                  class="name"
                  title="${esc(r.name)}"
                >
                  ${esc(r.name)}
                </div>

                <div class="track">

                  <div
                    class="fill"
                    style="
                      width:${
                        Math.max(
                          0,
                          (
                            r.value /
                            mx
                          ) * 100
                        )
                      }%;
                      ${
                        color
                          ? `background:${color}`
                          : ""
                      }
                    "
                  ></div>

                </div>

                <div class="val">

                  ${esc(r.text)}

                  ${
                    r.sub
                      ? `
                        <small>
                          ${esc(r.sub)}
                        </small>
                      `
                      : ""
                  }

                </div>

              </div>
            `
          )
          .join("")
      }

    </div>
  `;

}


/* =========================================================
   DIVERGING BARS
========================================================= */

export function divergingBars(rows) {

  const mx =
    Math.max(
      ...rows.map(
        (r) =>
          Math.abs(r.value)
      ),
      1e-9
    );


  return `
    <div class="hbars div-bars">

      ${
        rows
          .map(
            (r) => {

              const w =
                (
                  Math.abs(
                    r.value
                  ) /
                  mx
                ) * 50;

              const positive =
                r.value >= 0;


              return `
                <div class="hbar">

                  <div
                    class="name"
                    title="${esc(r.name)}"
                  >
                    ${esc(r.name)}
                  </div>

                  <div class="track">

                    <div
                      class="fill"
                      style="
                        width:${w}%;

                        ${
                          positive
                            ? `
                              left:50%;
                              background:
                              var(--bad);
                            `
                            : `
                              left:${50 - w}%;
                              background:
                              var(--c1);
                            `
                        }
                      "
                    ></div>

                  </div>

                  <div class="val">
                    ${esc(r.text)}
                  </div>

                </div>
              `;

            }
          )
          .join("")
      }

    </div>
  `;

}


/* =========================================================
   HEAT TABLE
========================================================= */

export function heatTable(
  rowKeys,
  colKeys,
  cell,
  {
    rowLabel = "",
    fmt = (v) =>
      `${(v * 100).toFixed(1)}%`
  } = {}
) {

  const vals =
    rowKeys
      .flatMap(
        (r) =>
          colKeys.map(
            (c) =>
              cell(r, c)?.value
          )
      )
      .filter(
        (v) => v != null
      );


  const lo =
    Math.min(...vals);

  const hi =
    Math.max(...vals);


  const shade = (v) => {

    const strength =
      .08 +
      .5 *
      (
        (v - lo) /
        (hi - lo || 1)
      );

    return `
      rgba(
        130,
        116,
        255,
        ${strength}
      )
    `;

  };


  return `
    <div class="table-wrap">

      <table class="heat">

        <thead>

          <tr>

            <th>
              ${esc(rowLabel)}
            </th>

            ${
              colKeys
                .map(
                  (c) => `
                    <th class="num">
                      ${esc(
                        String(c)
                          .replace(
                            /_/g,
                            " "
                          )
                      )}
                    </th>
                  `
                )
                .join("")
            }

          </tr>

        </thead>

        <tbody>

          ${
            rowKeys
              .map(
                (r) => `
                  <tr>

                    <td>
                      ${esc(
                        String(r)
                          .replace(
                            /_/g,
                            " "
                          )
                      )}
                    </td>

                    ${
                      colKeys
                        .map(
                          (c) => {

                            const x =
                              cell(
                                r,
                                c
                              );

                            return x

                              ? `
                                <td
                                  class="cell"
                                  style="
                                    background:
                                    ${shade(
                                      x.value
                                    )}
                                  "
                                  title="
                                    n=${x.n}
                                  "
                                >
                                  ${fmt(
                                    x.value
                                  )}
                                </td>
                              `

                              : `
                                <td
                                  class="cell"
                                >
                                  —
                                </td>
                              `;

                          }
                        )
                        .join("")
                    }

                  </tr>
                `
              )
              .join("")
          }

        </tbody>

      </table>

    </div>
  `;

}