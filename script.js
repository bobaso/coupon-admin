/* =========================================
   クーポン抽選 管理画面
   script.js
========================================= */


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

let statsPeriod = "today";


/* =========================================
   初期化
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadAll();

    }
);


/* =========================================
   メッセージ表示
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

    clearTimeout(
        showMessage.timer
    );

    showMessage.timer =
        setTimeout(
            () => {

                message.hidden = true;

            },
            4000
        );
}


/* =========================================
   API通信
========================================= */

async function apiFetch(
    path,
    options = {}
) {

    const fetchOptions = {
        ...options,
        headers: {
            "Content-Type":
                "application/json",

            ...(options.headers || {})
        }
    };


    const response =
        await fetch(
            API_URL + path,
            fetchOptions
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch (error) {

        throw new Error(
            "APIから正しいデータを取得できませんでした。"
        );

    }


    if (!response.ok) {

        throw new Error(
            data?.error ||
            `APIエラーが発生しました。(${response.status})`
        );

    }


    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.error ||
            "APIエラーが発生しました。"
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
        data &&
        data.campaign
    ) {

        if (
            data.campaign.start_date
        ) {

            startDate.value =
                String(
                    data.campaign.start_date
                ).substring(
                    0,
                    10
                );

        }


        if (
            data.campaign.end_date
        ) {

            endDate.value =
                String(
                    data.campaign.end_date
                ).substring(
                    0,
                    10
                );

        }

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
            "開始日と終了日を入力してください。",
            true
        );

        return;

    }


    if (start > end) {

        showMessage(
            "終了日は開始日以降にしてください。",
            true
        );

        return;

    }


    saveCampaignButton.disabled = true;

    saveCampaignButton.textContent =
        "保存中...";


    try {

        await apiFetch(
            "/admin/campaign",
            {
                method: "PUT",

                body:
                    JSON.stringify({
                        start_date: start,
                        end_date: end
                    })
            }
        );


        showMessage(
            "キャンペーン期間を保存しました。"
        );


    } catch (error) {

        console.error(
            "キャンペーン保存エラー:",
            error
        );

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

    couponList.innerHTML = `
        <div class="loading">
            読み込み中...
        </div>
    `;


    const data =
        await apiFetch(
            "/admin/coupons"
        );


    const serverCoupons =
        Array.isArray(
            data.coupons
        )
            ? data.coupons
            : [];


    coupons =
        serverCoupons.map(
            coupon => ({

                id:
                    coupon.id ?? null,

                rank:
                    String(
                        coupon.rank ?? ""
                    ),

                name:
                    String(
                        coupon.name ?? ""
                    ),

                probability:
                    toNumber(
                        coupon.probability
                    ),

                stock:
                    toNumber(
                        coupon.stock
                    ),

                created_at:
                    coupon.created_at ?? null

            })
        );


    renderCoupons();

}


/* =========================================
   数値変換
========================================= */

function toNumber(value) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : 0;

}


/* =========================================
   賞品表示
========================================= */

function renderCoupons() {

    if (
        !couponList
    ) {

        return;

    }


    if (
        coupons.length === 0
    ) {

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
                (
                    coupon,
                    index
                ) =>
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

    const rank =
        String(
            coupon.rank || ""
        )
        .replace(
            /等/g,
            ""
        );


    const isNew =
        coupon.isNew === true
            ? "new-item"
            : "";


    return `
        <div
            class="coupon-item ${isNew}"
            data-index="${index}"
        >

            <div class="coupon-rank-label">
                等級
            </div>

            <div class="rank-input-area">

                <input
                    type="number"
                    class="coupon-input coupon-rank-input"
                    value="${escapeHTML(rank)}"
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
                        value="${toNumber(coupon.probability)}"
                        data-index="${index}"
                        min="0"
                        step="1"
                    >

                </div>


                <div class="coupon-stat">

                    <span class="coupon-stat-label">
                        残り枚数
                    </span>

                    <input
                        type="number"
                        class="coupon-number-input coupon-stock-input"
                        value="${toNumber(coupon.stock)}"
                        data-index="${index}"
                        min="0"
                        step="1"
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

            const target =
                event.target;


            const index =
                Number(
                    target.dataset.index
                );


            if (
                !Number.isInteger(index) ||
                !coupons[index]
            ) {

                return;

            }


            if (
                target.classList.contains(
                    "coupon-rank-input"
                )
            ) {

                coupons[index].rank =
                    target.value;

            }


            if (
                target.classList.contains(
                    "coupon-name-input"
                )
            ) {

                coupons[index].name =
                    target.value;

            }


            if (
                target.classList.contains(
                    "coupon-probability-input"
                )
            ) {

                coupons[index].probability =
                    toNumber(
                        target.value
                    );

                updateProbabilityTotal();

            }


            if (
                target.classList.contains(
                    "coupon-stock-input"
                )
            ) {

                coupons[index].stock =
                    toNumber(
                        target.value
                    );

            }

        }
    );


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


            const rank =
                normalizeRank(
                    coupon.rank
                );


            const confirmed =
                confirm(
                    `${rank}「${coupon.name}」を削除しますか？\n\n「クーポン設定を保存」を押すまでサーバー上のデータは変更されません。`
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
                items[
                    items.length - 1
                ];


            if (!lastItem) {
                return;
            }


            lastItem.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            const rankInput =
                lastItem.querySelector(
                    ".coupon-rank-input"
                );


            if (rankInput) {

                setTimeout(
                    () => {

                        rankInput.focus();

                    },
                    300
                );

            }

        }
    );

}


/* =========================================
   等級整形
========================================= */

function normalizeRank(value) {

    return String(
        value ?? ""
    )
        .replace(
            /等/g,
            ""
        )
        .trim();

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
            (
                sum,
                coupon
            ) =>
                sum +
                toNumber(
                    coupon.probability
                ),
            0
        );


    probabilityTotal.textContent =
        `${total}%`;


    const parent =
        probabilityTotal.parentElement;


    if (!parent) {
        return;
    }


    parent.classList.remove(
        "is-valid",
        "is-invalid"
    );


    if (
        total === 100
    ) {

        parent.classList.add(
            "is-valid"
        );

    } else {

        parent.classList.add(
            "is-invalid"
        );

    }

}


/* =========================================
   クーポン保存
========================================= */

if (saveCouponsButton) {

    saveCouponsButton.addEventListener(
        "click",
        saveAllCoupons
    );

}


async function saveAllCoupons() {

    if (
        coupons.length === 0
    ) {

        showMessage(
            "賞品を1つ以上登録してください。",
            true
        );

        return;

    }


    /* -------------------------
       入力チェック
    ------------------------- */

    for (
        let i = 0;
        i < coupons.length;
        i++
    ) {

        const coupon =
            coupons[i];


        const rank =
            normalizeRank(
                coupon.rank
            );


        if (!rank) {

            showMessage(
                `${i + 1}番目の賞品の等級を入力してください。`,
                true
            );

            return;

        }


        if (
            !/^\d+$/.test(rank) ||
            Number(rank) < 1
        ) {

            showMessage(
                `${i + 1}番目の賞品の等級を正しく入力してください。`,
                true
            );

            return;

        }


        const name =
            String(
                coupon.name ?? ""
            ).trim();


        if (!name) {

            showMessage(
                `${rank}等の賞品名を入力してください。`,
                true
            );

            return;

        }


        const probability =
            Number(
                coupon.probability
            );


        if (
            !Number.isFinite(
                probability
            ) ||
            probability < 0
        ) {

            showMessage(
                `${rank}等の当選確率を確認してください。`,
                true
            );

            return;

        }


        const stock =
            Number(
                coupon.stock
            );


        if (
            !Number.isFinite(
                stock
            ) ||
            stock < 0
        ) {

            showMessage(
                `${rank}等の残り枚数を確認してください。`,
                true
            );

            return;

        }

    }


    /* -------------------------
       確率合計
    ------------------------- */

    const total =
        coupons.reduce(
            (
                sum,
                coupon
            ) =>
                sum +
                Number(
                    coupon.probability
                ),
            0
        );


    if (
        total !== 100
    ) {

        showMessage(
            `当選確率の合計が ${total}% です。100%にしてください。`,
            true
        );

        return;

    }


    /* -------------------------
       保存確認
    ------------------------- */

    const confirmed =
        confirm(
            "現在のクーポン設定をすべて保存しますか？"
        );


    if (!confirmed) {
        return;
    }


    saveCouponsButton.disabled =
        true;

    saveCouponsButton.textContent =
        "保存中...";


    try {

        const saveData =
            coupons.map(
                coupon => {

                    const rank =
                        normalizeRank(
                            coupon.rank
                        );


                    return {

                        id:
                            coupon.id,

                        rank:
                            `${rank}等`,

                        name:
                            String(
                                coupon.name ?? ""
                            ).trim(),

                        probability:
                            Number(
                                coupon.probability
                            ),

                        stock:
                            Number(
                                coupon.stock
                            )

                    };

                }
            );


        await apiFetch(
            "/admin/coupons",
            {

                method: "PUT",

                body:
                    JSON.stringify({
                        coupons: saveData
                    })

            }
        );


        showMessage(
            "クーポン設定を保存しました。"
        );


        await loadCoupons();

        renderCouponStats();


    } catch (error) {

        console.error(
            "クーポン保存エラー:",
            error
        );


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

    if (!historyBody) {
        return;
    }


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


    const data =
        await apiFetch(
            "/admin/history"
        );


    historyData =
        Array.isArray(
            data.history
        )
            ? data.history
            : [];


    renderHistory();

    renderCouponStats();

}


/* =========================================
   日本時間変換
========================================= */

function getJapanDate(value) {

    if (!value) {
        return null;
    }


    const stringValue =
        String(value).trim();


    /*
     * YYYY-MM-DD HH:mm:ss
     */

    const match =
        stringValue.match(
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


        /*
         * Cloudflare / DBから
         * タイムゾーンなしで来る日時は
         * 日本時間として扱う
         */

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
     * ISO形式
     */

    const date =
        new Date(
            stringValue
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return date;

}


/* =========================================
   現在時刻
========================================= */

function getJapanNow() {

    const now =
        new Date();


    return new Date(
        now.toLocaleString(
            "en-US",
            {
                timeZone:
                    "Asia/Tokyo"
            }
        )
    );

}


/* =========================================
   発券数集計
========================================= */

function countIssued(
    couponId,
    startDateValue = null
) {

    const now =
        getJapanNow();


    return historyData.filter(
        item => {

            if (
                Number(
                    item.coupon_id
                ) !==
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


            if (
                issued > now
            ) {

                return false;

            }


            if (
                startDateValue &&
                issued < startDateValue
            ) {

                return false;

            }


            return true;

        }
    ).length;

}


/* =========================================
   今日の発券数
========================================= */

function getTodayIssuedCount(
    couponId
) {

    const now =
        getJapanNow();


    const start =
        new Date(
            now
        );


    start.setHours(
        0,
        0,
        0,
        0
    );


    return countIssued(
        couponId,
        start
    );

}


/* =========================================
   1週間の発券数
========================================= */

function getWeekIssuedCount(
    couponId
) {

    const now =
        getJapanNow();


    const start =
        new Date(
            now
        );


    start.setDate(
        start.getDate() - 6
    );


    start.setHours(
        0,
        0,
        0,
        0
    );


    return countIssued(
        couponId,
        start
    );

}


/* =========================================
   1ヶ月の発券数
========================================= */

function getMonthIssuedCount(
    couponId
) {

    const now =
        getJapanNow();


    const start =
        new Date(
            now
        );


    start.setDate(
        start.getDate() - 29
    );


    start.setHours(
        0,
        0,
        0,
        0
    );


    return countIssued(
        couponId,
        start
    );

}


/* =========================================
   全期間
========================================= */

function getAllIssuedCount(
    couponId
) {

    return historyData.filter(
        item =>
            Number(
                item.coupon_id
            ) ===
            Number(couponId)
    ).length;

}


/* =========================================
   発券数取得
========================================= */

function getIssuedCount(
    couponId,
    period
) {

    switch (period) {

        case "today":

            return getTodayIssuedCount(
                couponId
            );


        case "week":

            return getWeekIssuedCount(
                couponId
            );


        case "month":

            return getMonthIssuedCount(
                couponId
            );


        case "all":

            return getAllIssuedCount(
                couponId
            );


        default:

            return 0;

    }

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


    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>残り枚数</th>

            <th>発券枚数</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        couponStatsBody.innerHTML = `
            <tr>

                <td
                    colspan="5"
                    class="loading"
                >
                    賞品がありません。
                </td>

            </tr>
        `;

        return;

    }


    couponStatsBody.innerHTML =
        coupons
            .map(
                coupon => {

                    let designClass =
                        "rank-3";


                    if (
                        normalizeRank(
                            coupon.rank
                        ) === "1"
                    ) {

                        designClass =
                            "rank-1";

                    } else if (
                        normalizeRank(
                            coupon.rank
                        ) === "2"
                    ) {

                        designClass =
                            "rank-2";

                    }


                    const issuedCount =
                        getIssuedCount(
                            coupon.id,
                            statsPeriod
                        );


                    return `
                        <tr>

                            <td>
                                ${escapeHTML(
                                    coupon.id ?? "-"
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
                                    ${toNumber(
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


    let filteredHistory =
        historyData;


    if (
        historyFilter === "unused"
    ) {

        filteredHistory =
            historyData.filter(
                item =>
                    Number(
                        item.used
                    ) !== 1
            );

    }


    if (
        historyFilter === "used"
    ) {

        filteredHistory =
            historyData.filter(
                item =>
                    Number(
                        item.used
                    ) === 1
            );

    }


    if (
        filteredHistory.length === 0
    ) {

        let text =
            "発券履歴がありません。";


        if (
            historyFilter === "unused"
        ) {

            text =
                "未使用のクーポンはありません。";

        }


        if (
            historyFilter === "used"
        ) {

            text =
                "使用済みのクーポンはありません。";

        }


        historyBody.innerHTML = `
            <tr>

                <td
                    colspan="6"
                    class="loading"
                >
                    ${escapeHTML(text)}
                </td>

            </tr>
        `;

        return;

    }


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

function createHistoryHTML(
    item
) {

    const used =
        Number(
            item.used
        ) === 1;


    return `
        <tr>

            <td>
                ${escapeHTML(
                    item.id ?? "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.rank ?? "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    item.name ?? "-"
                )}
            </td>

            <td>
                ${formatDate(
                    item.issued_at
                )}
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
                        ? formatDate(
                            item.used_at
                        )
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
    .forEach(
        button => {

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
                        button.dataset.filter ||
                        "all";


                    renderHistory();

                }
            );

        }
    );


/* =========================================
   発券状況期間切り替え
========================================= */

document
    .querySelectorAll(
        "[data-stats-period]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            "[data-stats-period]"
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


                    statsPeriod =
                        button.dataset.statsPeriod ||
                        "today";


                    renderCouponStats();

                }
            );

        }
    );


/* =========================================
   発券状況更新
========================================= */

if (
    reloadStatsButton
) {

    reloadStatsButton.addEventListener(
        "click",
        async () => {

            reloadStatsButton.disabled =
                true;

            reloadStatsButton.textContent =
                "更新中...";


            try {

                await loadHistory();

                showMessage(
                    "発券状況を更新しました。"
                );

            } catch (error) {

                console.error(
                    "発券状況更新エラー:",
                    error
                );

                showMessage(
                    error.message,
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
   日付表示
========================================= */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        getJapanDate(
            value
        );


    if (!date) {

        return String(
            value
        );

    }


    return new Intl.DateTimeFormat(
        "ja-JP",
        {

            timeZone:
                "Asia/Tokyo",

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    ).format(
        date
    );

}


/* =========================================
   HTMLエスケープ
========================================= */

function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================
   全データ読み込み
========================================= */

async function loadAll() {

    try {

        /*
         * 3つを同時取得
         */

        await Promise.all([
            loadCampaign(),
            loadCoupons(),
            loadHistory()
        ]);


        /*
         * 最終的に発券状況を表示
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

if (
    reloadButton
) {

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


            reloadButton.disabled =
                true;

            reloadButton.textContent =
                "更新中...";


            try {

                await loadAll();


                showMessage(
                    "データを更新しました。"
                );


            } catch (error) {

                console.error(
                    "データ更新エラー:",
                    error
                );


                showMessage(
                    error.message,
                    true
                );

            } finally {

                reloadButton.disabled =
                    false;

                reloadButton.textContent =
                    "データ更新";

            }

        }
    );

}


/* =========================================
   キャンペーン保存
========================================= */

if (
    saveCampaignButton
) {

    saveCampaignButton.addEventListener(
        "click",
        saveCampaign
    );

}
