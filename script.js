/* =========================================
   Cloudflare Worker
========================================= */

const API_URL =
    "https://coupon-api.yoshioka-mwork.workers.dev";


/* =========================================
   DOM
========================================= */

const startDate =
    document.getElementById("startDate");

const endDate =
    document.getElementById("endDate");

const saveCampaignButton =
    document.getElementById("saveCampaignButton");

const reloadButton =
    document.getElementById("reloadButton");

const couponList =
    document.getElementById("couponList");

const probabilityTotal =
    document.getElementById("probabilityTotal");

const saveCouponsButton =
    document.getElementById("saveCouponsButton");

const addCouponButton =
    document.getElementById("addCouponButton");

const historyBody =
    document.getElementById("historyBody");

const message =
    document.getElementById("message");


/* =========================================
   発券状況DOM
========================================= */

const couponStatsBody =
    document.getElementById("couponStatsBody");

const couponStatsHead =
    document.getElementById("couponStatsHead");

const reloadStatsButton =
    document.getElementById("reloadStatsButton");


/* =========================================
   データ
========================================= */

let coupons = [];

let historyData = [];

let historyFilter = "all";

/*
 * 発券状況の初期表示
 *
 * today
 * week
 * month
 * all
 */
let statsPeriod = "month";


/* =========================================
   メッセージ
========================================= */

function showMessage(text, error = false) {

    if (!message) {
        return;
    }

    message.textContent = text;

    message.hidden = false;

    message.classList.toggle(
        "error",
        error
    );


    setTimeout(() => {

        message.hidden = true;

    }, 4000);

}


/* =========================================
   API
========================================= */

async function apiFetch(
    path,
    options = {}
) {

    const response =
        await fetch(
            API_URL + path,
            {
                ...options,

                headers: {

                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})

                }

            }
        );


    let data;

    try {

        data =
            await response.json();

    } catch (error) {

        throw new Error(
            "サーバーから正しいデータを取得できませんでした"
        );

    }


    if (
        !response.ok ||
        data.success === false
    ) {

        throw new Error(
            data.error ||
            "APIエラーが発生しました"
        );

    }


    return data;

}


/* =========================================
   キャンペーン取得
========================================= */

async function loadCampaign() {

    const data =
        await apiFetch(
            "/admin/campaign"
        );


    if (
        data.campaign &&
        data.campaign.start_date
    ) {

        startDate.value =
            data.campaign.start_date;

    }


    if (
        data.campaign &&
        data.campaign.end_date
    ) {

        endDate.value =
            data.campaign.end_date;

    }

}


/* =========================================
   キャンペーン保存
========================================= */

async function saveCampaign() {

    const start =
        startDate.value;

    const end =
        endDate.value;


    if (!start || !end) {

        showMessage(
            "開始日と終了日を入力してください",
            true
        );

        return;

    }


    if (start > end) {

        showMessage(
            "終了日は開始日以降にしてください",
            true
        );

        return;

    }


    saveCampaignButton.disabled =
        true;

    saveCampaignButton.textContent =
        "保存中...";


    try {

        await apiFetch(
            "/admin/campaign",
            {

                method: "PUT",

                body: JSON.stringify({

                    start_date: start,

                    end_date: end

                })

            }
        );


        showMessage(
            "キャンペーン期間を保存しました"
        );


        /*
         * 発券状況も更新
         */

        renderCouponStats();


    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            true
        );

    } finally {

        saveCampaignButton.disabled =
            false;

        saveCampaignButton.textContent =
            "開催期間を保存";

    }

}


/* =========================================
   賞品取得
========================================= */

async function loadCoupons() {

    if (couponList) {

        couponList.innerHTML = `
            <div class="loading">
                読み込み中...
            </div>
        `;

    }


    const data =
        await apiFetch(
            "/admin/coupons"
        );


    coupons =
        (data.coupons || [])
            .map(coupon => ({

                id:
                    coupon.id,

                rank:
                    coupon.rank,

                name:
                    coupon.name,

                probability:
                    Number(
                        coupon.probability
                    ) || 0,

                stock:
                    Number(
                        coupon.stock
                    ) || 0,

                created_at:
                    coupon.created_at

            }));


    renderCoupons();

}


/* =========================================
   賞品表示
========================================= */

function renderCoupons() {

    if (!couponList) {
        return;
    }


    if (coupons.length === 0) {

        couponList.innerHTML = `
            <div class="loading">
                賞品がありません。
            </div>
        `;

        updateProbabilityTotal();

        return;

    }


    couponList.innerHTML =
        coupons
            .map(
                (coupon, index) =>
                    createCouponHTML(
                        coupon,
                        index
                    )
            )
            .join("");


    updateProbabilityTotal();

}


/* =========================================
   賞品HTML
========================================= */

function createCouponHTML(
    coupon,
    index
) {

    const newClass =
        coupon.isNew
            ? "new-item"
            : "";


    return `

        <div
            class="coupon-item ${newClass}"
            data-index="${index}"
        >

            <div class="coupon-rank-label">
                等級
            </div>


            <div class="rank-input-area">

                <input
                    type="number"
                    class="coupon-input coupon-rank-input"
                    value="${escapeHTML(
                        String(coupon.rank)
                            .replace("等", "")
                    )}"
                    data-index="${index}"
                    placeholder="例：1"
                    min="1"
                    step="1"
                >

                <span class="rank-suffix">
                    等
                </span>

            </div>


            <div class="coupon-rank-label">
                賞品名
            </div>


            <input
                type="text"
                class="coupon-input coupon-name-input"
                value="${escapeHTML(coupon.name)}"
                data-index="${index}"
                placeholder="賞品名"
            >


            <div class="coupon-stats">

                <div class="coupon-stat">

                    <span class="coupon-stat-label">
                        当選確率（%）
                    </span>

                    <input
                        type="number"
                        class="coupon-number-input coupon-probability-input"
                        value="${coupon.probability}"
                        min="0"
                        step="1"
                        data-index="${index}"
                    >

                </div>


                <div class="coupon-stat">

                    <span class="coupon-stat-label">
                        残り枚数
                    </span>

                    <input
                        type="number"
                        class="coupon-number-input coupon-stock-input"
                        value="${coupon.stock}"
                        min="0"
                        step="1"
                        data-index="${index}"
                    >

                </div>

            </div>


            <button
                type="button"
                class="coupon-delete-button"
                data-delete-index="${index}"
            >
                この賞品を削除
            </button>

        </div>

    `;

}


/* =========================================
   賞品入力変更
========================================= */

if (couponList) {

    couponList.addEventListener(
        "input",
        event => {

            const index =
                Number(
                    event.target.dataset.index
                );


            if (
                !Number.isInteger(index) ||
                !coupons[index]
            ) {

                return;

            }


            /*
             * 等級
             */

            if (
                event.target.classList.contains(
                    "coupon-rank-input"
                )
            ) {

                coupons[index].rank =
                    event.target.value
                        .replace("等", "");

            }


            /*
             * 賞品名
             */

            if (
                event.target.classList.contains(
                    "coupon-name-input"
                )
            ) {

                coupons[index].name =
                    event.target.value;

            }


            /*
             * 当選確率
             */

            if (
                event.target.classList.contains(
                    "coupon-probability-input"
                )
            ) {

                coupons[index].probability =
                    Number(
                        event.target.value
                    ) || 0;

                updateProbabilityTotal();

            }


            /*
             * 残り枚数
             */

            if (
                event.target.classList.contains(
                    "coupon-stock-input"
                )
            ) {

                coupons[index].stock =
                    Number(
                        event.target.value
                    ) || 0;

            }

        }
    );

}


/* =========================================
   賞品削除
========================================= */

if (couponList) {

    couponList.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-delete-index]"
                );


            if (!button) {
                return;
            }


            const index =
                Number(
                    button.dataset.deleteIndex
                );


            if (
                !Number.isInteger(index) ||
                !coupons[index]
            ) {

                return;

            }


            const coupon =
                coupons[index];


            const confirmed =
                confirm(
                    `${coupon.rank}「${coupon.name}」を削除しますか？\n\n「クーポン設定を保存」を押すまでデータベースからは削除されません。`
                );


            if (!confirmed) {
                return;
            }


            coupons.splice(
                index,
                1
            );


            renderCoupons();

        }
    );

}


/* =========================================
   賞品追加
========================================= */

if (addCouponButton) {

    addCouponButton.addEventListener(
        "click",
        () => {

            coupons.push({

                id: null,

                rank: "",

                name: "",

                probability: 0,

                stock: 0,

                isNew: true

            });


            renderCoupons();


            const items =
                couponList.querySelectorAll(
                    ".coupon-item"
                );


            const lastItem =
                items[items.length - 1];


            if (lastItem) {

                lastItem.scrollIntoView({

                    behavior: "smooth",

                    block: "center"

                });


                const rankInput =
                    lastItem.querySelector(
                        ".coupon-rank-input"
                    );


                if (rankInput) {

                    setTimeout(() => {

                        rankInput.focus();

                    }, 300);

                }

            }

        }
    );

}


/* =========================================
   確率合計
========================================= */

function updateProbabilityTotal() {

    if (!probabilityTotal) {
        return;
    }


    const total =
        coupons.reduce(
            (sum, coupon) =>
                sum +
                Number(
                    coupon.probability
                ),
            0
        );


    probabilityTotal.textContent =
        `${total}%`;


    if (
        probabilityTotal.parentElement
    ) {

        probabilityTotal.parentElement
            .classList.remove(
                "is-valid",
                "is-invalid"
            );


        if (total === 100) {

            probabilityTotal.parentElement
                .classList.add(
                    "is-valid"
                );

        } else {

            probabilityTotal.parentElement
                .classList.add(
                    "is-invalid"
                );

        }

    }

}


/* =========================================
   クーポン一括保存
========================================= */

if (saveCouponsButton) {

    saveCouponsButton.addEventListener(
        "click",
        saveAllCoupons
    );

}


async function saveAllCoupons() {

    if (coupons.length === 0) {

        showMessage(
            "賞品を1つ以上登録してください",
            true
        );

        return;

    }


    /*
     * 入力チェック
     */

    for (
        let i = 0;
        i < coupons.length;
        i++
    ) {

        const coupon =
            coupons[i];


        if (
            !String(
                coupon.rank
            ).trim()
        ) {

            showMessage(
                `${i + 1}番目の賞品の等級を入力してください`,
                true
            );

            return;

        }


        if (
            !String(
                coupon.name
            ).trim()
        ) {

            showMessage(
                `${coupon.rank}の賞品名を入力してください`,
                true
            );

            return;

        }


        if (
            !Number.isFinite(
                Number(
                    coupon.probability
                )
            ) ||
            Number(
                coupon.probability
            ) < 0
        ) {

            showMessage(
                `${coupon.rank}の当選確率を確認してください`,
                true
            );

            return;

        }


        if (
            !Number.isFinite(
                Number(
                    coupon.stock
                )
            ) ||
            Number(
                coupon.stock
            ) < 0
        ) {

            showMessage(
                `${coupon.rank}の残り枚数を確認してください`,
                true
            );

            return;

        }

    }


    /*
     * 確率合計
     */

    const total =
        coupons.reduce(
            (sum, coupon) =>
                sum +
                Number(
                    coupon.probability
                ),
            0
        );


    if (total !== 100) {

        showMessage(
            `当選確率の合計が ${total}% です。100%にしてください。`,
            true
        );

        return;

    }


    /*
     * 保存確認
     */

    const confirmed =
        confirm(
            "現在のクーポン設定をすべて保存しますか？"
        );


    if (!confirmed) {
        return;
    }


    /*
     * 保存中
     */

    saveCouponsButton.disabled =
        true;

    saveCouponsButton.textContent =
        "保存中...";


    try {

        await apiFetch(
            "/admin/coupons",
            {

                method: "PUT",

                body: JSON.stringify({

                    coupons:
                        coupons.map(
                            coupon => ({

                                id:
                                    coupon.id,

                                rank:
                                    `${String(
                                        coupon.rank
                                    )
                                        .replace(
                                            "等",
                                            ""
                                        )
                                        .trim()}等`,

                                name:
                                    String(
                                        coupon.name
                                    ).trim(),

                                probability:
                                    Number(
                                        coupon.probability
                                    ),

                                stock:
                                    Number(
                                        coupon.stock
                                    )

                            })
                        )

                })

            }
        );


        showMessage(
            "クーポン設定を保存しました"
        );


        await loadCoupons();


        /*
         * 発券状況も更新
         */

        renderCouponStats();


    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            true
        );

    } finally {

        saveCouponsButton.disabled =
            false;

        saveCouponsButton.textContent =
            "クーポン設定を保存";

    }

}


/* =========================================
   発券履歴取得
========================================= */

async function loadHistory() {

    if (historyBody) {

        historyBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="loading"
                >
                    読み込み中...
                </td>
            </tr>
        `;

    }


    const data =
        await apiFetch(
            "/admin/history"
        );


    historyData =
        Array.isArray(data.history)
            ? data.history
            : [];


    renderHistory();


    /*
     * 発券状況更新
     */

    renderCouponStats();

}


/* =========================================
   発券日時を日本時間として取得
========================================= */

function getJapanDate(value) {

    if (!value) {
        return null;
    }


    /*
     * Dateオブジェクトの場合
     */

    if (
        value instanceof Date
    ) {

        return new Date(value.getTime());

    }


    let text =
        String(value).trim();


    if (!text) {
        return null;
    }


    /*
     * =====================================
     * ISO形式
     *
     * 2026-09-01T01:00:00Z
     * 2026-09-01T01:00:00+00:00
     * =====================================
     */

    if (
        text.includes("T") &&
        (
            text.endsWith("Z") ||
            /[+-]\d{2}:\d{2}$/.test(text)
        )
    ) {

        const date =
            new Date(text);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return new Date(
            date.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Tokyo"
                }
            )
        );

    }


    /*
     * =====================================
     * YYYY-MM-DD HH:mm:ss
     *
     * Cloudflare / SQLite等から
     * 日本時間で保存されている場合
     * =====================================
     */

    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
        );


    if (match) {

        const year =
            Number(match[1]);

        const month =
            Number(match[2]);

        const day =
            Number(match[3]);

        const hour =
            Number(match[4]);

        const minute =
            Number(match[5]);

        const second =
            Number(match[6] || 0);


        return new Date(
            year,
            month - 1,
            day,
            hour,
            minute,
            second
        );

    }


    /*
     * その他の形式
     */

    const fallback =
        new Date(text);


    if (
        Number.isNaN(
            fallback.getTime()
        )
    ) {

        return null;

    }


    return fallback;

}


/* =========================================
   今日の開始時刻
========================================= */

function getTodayStart() {

    const now =
        new Date();


    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
    );

}


/* =========================================
   発券数取得
========================================= */

function getIssuedCount(
    couponId,
    period
) {

    const now =
        new Date();


    /*
     * 全期間
     */

    if (
        period === "all"
    ) {

        return historyData.filter(
            item =>
                Number(item.coupon_id) ===
                Number(couponId) &&
                getJapanDate(item.issued_at)
        ).length;

    }


    /*
     * 今日
     */

    if (
        period === "today"
    ) {

        const start =
            getTodayStart();


        return historyData.filter(
            item => {

                if (
                    Number(item.coupon_id) !==
                    Number(couponId)
                ) {

                    return false;

                }


                const issued =
                    getJapanDate(
                        item.issued_at
                    );


                if (!issued) {
                    return false;
                }


                return (
                    issued >= start &&
                    issued <= now
                );

            }
        ).length;

    }


    /*
     * 1週間
     *
     * 今日を含む過去7日間
     */

    if (
        period === "week"
    ) {

        const start =
            new Date(
                getTodayStart()
            );


        start.setDate(
            start.getDate() - 6
        );


        return historyData.filter(
            item => {

                if (
                    Number(item.coupon_id) !==
                    Number(couponId)
                ) {

                    return false;

                }


                const issued =
                    getJapanDate(
                        item.issued_at
                    );


                if (!issued) {
                    return false;
                }


                return (
                    issued >= start &&
                    issued <= now
                );

            }
        ).length;

    }


    /*
     * 1ヶ月
     *
     * 今日を含む過去30日間
     */

    if (
        period === "month"
    ) {

        const start =
            new Date(
                getTodayStart()
            );


        start.setDate(
            start.getDate() - 29
        );


        return historyData.filter(
            item => {

                if (
                    Number(item.coupon_id) !==
                    Number(couponId)
                ) {

                    return false;

                }


                const issued =
                    getJapanDate(
                        item.issued_at
                    );


                if (!issued) {
                    return false;
                }


                return (
                    issued >= start &&
                    issued <= now
                );

            }
        ).length;

    }


    return 0;

}


/* =========================================
   1週間：曜日別発券数
========================================= */

function getWeeklyIssuedCounts(
    couponId
) {

    const now =
        new Date();


    const todayStart =
        getTodayStart();


    /*
     * 今日を含む過去7日間
     */

    const startTime =
        new Date(
            todayStart
        );


    startTime.setDate(
        startTime.getDate() - 6
    );


    const counts = {

        0: 0,

        1: 0,

        2: 0,

        3: 0,

        4: 0,

        5: 0,

        6: 0

    };


    historyData.forEach(
        item => {

            if (
                Number(item.coupon_id) !==
                Number(couponId)
            ) {

                return;

            }


            const issued =
                getJapanDate(
                    item.issued_at
                );


            if (!issued) {
                return;
            }


            if (
                issued < startTime ||
                issued > now
            ) {

                return;

            }


            const day =
                issued.getDay();


            counts[day]++;

        }
    );


    return counts;

}


/* =========================================
   発券状況表示
========================================= */

function renderCouponStats() {

    if (
        !couponStatsBody ||
        !couponStatsHead
    ) {

        return;

    }


    /*
     * =====================================
     * 今日
     * =====================================
     */

    if (
        statsPeriod === "today"
    ) {

        renderTodayStats();

        return;

    }


    /*
     * =====================================
     * 1週間
     * =====================================
     */

    if (
        statsPeriod === "week"
    ) {

        renderWeekStats();

        return;

    }


    /*
     * =====================================
     * 1ヶ月
     * =====================================
     */

    if (
        statsPeriod === "month"
    ) {

        renderMonthStats();

        return;

    }


    /*
     * =====================================
     * 全期間
     * =====================================
     */

    renderAllStats();

}


/* =========================================
   等級デザイン
========================================= */

function getRankDesignClass(rank) {

    const cleanRank =
        String(rank)
            .trim();


    if (
        cleanRank === "1等"
    ) {

        return "rank-1";

    }


    if (
        cleanRank === "2等"
    ) {

        return "rank-2";

    }


    return "rank-3";

}


/* =========================================
   共通：賞品なし
========================================= */

function renderStatsEmpty(
    colspan
) {

    couponStatsBody.innerHTML = `

        <tr>

            <td
                colspan="${colspan}"
                class="loading"
            >
                賞品がありません。
            </td>

        </tr>

    `;

}


/* =========================================
   今日
========================================= */

function renderTodayStats() {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>残り枚数</th>

            <th>今日の発券枚数</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        renderStatsEmpty(5);

        return;

    }


    couponStatsBody.innerHTML =
        coupons
            .map(
                coupon => {

                    const issuedCount =
                        getIssuedCount(
                            coupon.id,
                            "today"
                        );


                    const designClass =
                        getRankDesignClass(
                            coupon.rank
                        );


                    return `

                        <tr>

                            <td>
                                ${Number(
                                    coupon.id
                                )}
                            </td>


                            <td>

                                <span
                                    class="stats-rank ${designClass}"
                                >
                                    ${escapeHTML(
                                        coupon.rank
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="stats-name"
                                >
                                    ${escapeHTML(
                                        coupon.name
                                    )}
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-stock"
                                >
                                    ${Number(
                                        coupon.stock
                                    )}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-issued"
                                >
                                    ${issuedCount}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================
   1週間
========================================= */

function renderWeekStats() {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>残り枚数</th>

            <th>月</th>

            <th>火</th>

            <th>水</th>

            <th>木</th>

            <th>金</th>

            <th>土</th>

            <th>日</th>

            <th>合計</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        renderStatsEmpty(12);

        return;

    }


    couponStatsBody.innerHTML =
        coupons
            .map(
                coupon => {

                    const weekly =
                        getWeeklyIssuedCounts(
                            coupon.id
                        );


                    const total =
                        Object.values(
                            weekly
                        ).reduce(
                            (
                                sum,
                                count
                            ) =>
                                sum + count,
                            0
                        );


                    const designClass =
                        getRankDesignClass(
                            coupon.rank
                        );


                    return `

                        <tr>

                            <td>
                                ${Number(
                                    coupon.id
                                )}
                            </td>


                            <td>

                                <span
                                    class="stats-rank ${designClass}"
                                >
                                    ${escapeHTML(
                                        coupon.rank
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="stats-name"
                                >
                                    ${escapeHTML(
                                        coupon.name
                                    )}
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-stock"
                                >
                                    ${Number(
                                        coupon.stock
                                    )}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>


                            <td>
                                ${weekly[1]}
                            </td>


                            <td>
                                ${weekly[2]}
                            </td>


                            <td>
                                ${weekly[3]}
                            </td>


                            <td>
                                ${weekly[4]}
                            </td>


                            <td>
                                ${weekly[5]}
                            </td>


                            <td>
                                ${weekly[6]}
                            </td>


                            <td>
                                ${weekly[0]}
                            </td>


                            <td>

                                <strong
                                    class="stats-issued"
                                >
                                    ${total}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================
   1ヶ月
========================================= */

function renderMonthStats() {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>残り枚数</th>

            <th>過去30日間の発券枚数</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        renderStatsEmpty(5);

        return;

    }


    couponStatsBody.innerHTML =
        coupons
            .map(
                coupon => {

                    const issuedCount =
                        getIssuedCount(
                            coupon.id,
                            "month"
                        );


                    const designClass =
                        getRankDesignClass(
                            coupon.rank
                        );


                    return `

                        <tr>

                            <td>
                                ${Number(
                                    coupon.id
                                )}
                            </td>


                            <td>

                                <span
                                    class="stats-rank ${designClass}"
                                >
                                    ${escapeHTML(
                                        coupon.rank
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="stats-name"
                                >
                                    ${escapeHTML(
                                        coupon.name
                                    )}
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-stock"
                                >
                                    ${Number(
                                        coupon.stock
                                    )}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-issued"
                                >
                                    ${issuedCount}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================
   全期間
========================================= */

function renderAllStats() {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>残り枚数</th>

            <th>全期間の発券枚数</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        renderStatsEmpty(5);

        return;

    }


    couponStatsBody.innerHTML =
        coupons
            .map(
                coupon => {

                    const issuedCount =
                        getIssuedCount(
                            coupon.id,
                            "all"
                        );


                    const designClass =
                        getRankDesignClass(
                            coupon.rank
                        );


                    return `

                        <tr>

                            <td>
                                ${Number(
                                    coupon.id
                                )}
                            </td>


                            <td>

                                <span
                                    class="stats-rank ${designClass}"
                                >
                                    ${escapeHTML(
                                        coupon.rank
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="stats-name"
                                >
                                    ${escapeHTML(
                                        coupon.name
                                    )}
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-stock"
                                >
                                    ${Number(
                                        coupon.stock
                                    )}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>


                            <td>

                                <strong
                                    class="stats-issued"
                                >
                                    ${issuedCount}
                                </strong>

                                <span>
                                    枚
                                </span>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================
   発券履歴表示
========================================= */

function renderHistory() {

    if (!historyBody) {
        return;
    }


    let filteredHistory;


    /*
     * 未使用
     */

    if (
        historyFilter === "unused"
    ) {

        filteredHistory =
            historyData.filter(
                item =>
                    Number(item.used) !== 1
            );

    }


    /*
     * 使用済み
     */

    else if (
        historyFilter === "used"
    ) {

        filteredHistory =
            historyData.filter(
                item =>
                    Number(item.used) === 1
            );

    }


    /*
     * 全て
     */

    else {

        filteredHistory =
            historyData;

    }


    /*
     * データなし
     */

    if (
        filteredHistory.length === 0
    ) {

        let messageText =
            "発券履歴がありません。";


        if (
            historyFilter === "unused"
        ) {

            messageText =
                "未使用のクーポンはありません。";

        }


        if (
            historyFilter === "used"
        ) {

            messageText =
                "使用済みのクーポンはありません。";

        }


        historyBody.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="loading"
                >
                    ${messageText}
                </td>

            </tr>

        `;

        return;

    }


    /*
     * 表示
     */

    historyBody.innerHTML =
        filteredHistory
            .map(
                createHistoryHTML
            )
            .join("");

}


/* =========================================
   発券履歴HTML
========================================= */

function createHistoryHTML(item) {

    const used =
        Number(item.used) === 1;


    return `

        <tr>

            <td>
                ${Number(item.id)}
            </td>


            <td>
                ${escapeHTML(item.rank)}
            </td>


            <td>
                ${escapeHTML(item.name)}
            </td>


            <td>
                ${formatDate(item.issued_at)}
            </td>


            <td>

                ${
                    used

                    ? `
                        <span class="status used">
                            使用済み
                        </span>
                    `

                    : `
                        <span class="status unused">
                            未使用
                        </span>
                    `
                }

            </td>


            <td>

                ${
                    item.used_at
                    ? formatDate(item.used_at)
                    : "-"
                }

            </td>

        </tr>

    `;

}


/* =========================================
   履歴フィルター
========================================= */

document
    .querySelectorAll(
        ".history-filter-button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".history-filter-button"
                    )
                    .forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                button.classList.add(
                    "active"
                );


                historyFilter =
                    button.dataset.filter;


                renderHistory();

            }
        );

    });


/* =========================================
   日付表示
========================================= */

function formatDate(value) {

    if (!value) {

        return "-";

    }


    const date =
        getJapanDate(value);


    if (!date) {

        return String(value);

    }


    return date.toLocaleString(
        "ja-JP",
        {

            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit"

        }
    );

}


/* =========================================
   HTMLエスケープ
========================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   全データ読み込み
========================================= */

async function loadAll() {

    try {

        /*
         * キャンペーン
         */

        await loadCampaign();


        /*
         * 賞品
         */

        await loadCoupons();


        /*
         * 発券履歴
         */

        await loadHistory();


        /*
         * 最後に発券状況を表示
         */

        renderCouponStats();


    } catch (error) {

        console.error(
            "データ読み込みエラー:",
            error
        );


        showMessage(
            error.message,
            true
        );

    }

}


/* =========================================
   データ更新
========================================= */

if (reloadButton) {

    reloadButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                confirm(
                    "現在画面上で変更している内容は破棄されます。\nデータを再読み込みしますか？"
                );


            if (!confirmed) {
                return;
            }


            await loadAll();

        }
    );

}


/* =========================================
   キャンペーン保存
========================================= */

if (saveCampaignButton) {

    saveCampaignButton.addEventListener(
        "click",
        saveCampaign
    );

}


/* =========================================
   発券状況 更新ボタン
========================================= */

if (reloadStatsButton) {

    reloadStatsButton.addEventListener(
        "click",
        async function () {

            reloadStatsButton.disabled =
                true;

            reloadStatsButton.textContent =
                "更新中...";


            try {

                await loadAll();


                showMessage(
                    "発券状況を更新しました"
                );


            } catch (error) {

                console.error(
                    "発券状況更新エラー:",
                    error
                );


                showMessage(
                    "更新に失敗しました",
                    true
                );

            } finally {

                reloadStatsButton.disabled =
                    false;

                reloadStatsButton.textContent =
                    "更新";

            }

        }
    );

}


/* =========================================
   発券状況 期間切り替え
========================================= */

const statsPeriodButtons =
    document.querySelectorAll(
        "[data-stats-period]"
    );


statsPeriodButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function () {

                /*
                 * 選択期間
                 */

                statsPeriod =
                    this.dataset.statsPeriod;


                /*
                 * ボタンの選択状態
                 */

                statsPeriodButtons.forEach(
                    btn => {

                        btn.classList.remove(
                            "active"
                        );

                    }
                );


                this.classList.add(
                    "active"
                );


                /*
                 * 発券状況再表示
                 */

                renderCouponStats();

            }
        );

    }
);


/* =========================================
   初期読み込み
========================================= */

loadAll();

