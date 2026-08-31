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
   現在の賞品データ
========================================= */

let coupons = [];
let historyData = [];

let historyFilter = "all";

/* =========================================
   メッセージ
========================================= */

function showMessage(text, error = false) {

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


    const data =
        await response.json();


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


    startDate.value =
        data.campaign.start_date;

    endDate.value =
        data.campaign.end_date;

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


    } catch (error) {

        showMessage(
            error.message,
            true
        );

    }


    saveCampaignButton.disabled =
        false;

    saveCampaignButton.textContent =
        "開催期間を保存";

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
                    ),

                stock:
                    Number(
                        coupon.stock
                    ),

                created_at:
                    coupon.created_at

            }));


    renderCoupons();

}


/* =========================================
   賞品表示
========================================= */

function renderCoupons() {

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


            <input
                type="text"
                class="coupon-input coupon-rank-input"
                value="${escapeHTML(coupon.rank)}"
                data-index="${index}"
                placeholder="例：1等"
            >


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
   入力変更
========================================= */

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


        if (
            event.target.classList.contains(
                "coupon-rank-input"
            )
        ) {

            coupons[index].rank =
                event.target.value;

        }


        if (
            event.target.classList.contains(
                "coupon-name-input"
            )
        ) {

            coupons[index].name =
                event.target.value;

        }


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


/* =========================================
   賞品削除
========================================= */

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
                `${coupon.rank}「${coupon.name}」を削除しますか？\n\n「クーポン設定を保存」を押すまでD1からは削除されません。`
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


/* =========================================
   賞品追加
========================================= */

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


/* =========================================
   確率合計
========================================= */

function updateProbabilityTotal() {

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


/* =========================================
   クーポン一括保存
========================================= */

saveCouponsButton.addEventListener(
    "click",
    saveAllCoupons
);


async function saveAllCoupons() {

    /*
     * 賞品が0件
     */

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
            !coupon.rank.trim()
        ) {

            showMessage(
                `${i + 1}番目の賞品の等級を入力してください`,
                true
            );

            return;

        }


        if (
            !coupon.name.trim()
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

        /*
         * Workerへ一括送信
         */

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
                                    coupon.rank.trim(),

                                name:
                                    coupon.name.trim(),

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


        /*
         * 最新データを再取得
         */

        await loadCoupons();


    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            true
        );

    }


    saveCouponsButton.disabled =
        false;

    saveCouponsButton.textContent =
        "クーポン設定を保存";

}


/* =========================================
   発券履歴
========================================= */

async function loadHistory() {

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


    const history =
        data.history || [];


    if (history.length === 0) {

        historyBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="loading"
                >
                    発券履歴がありません。
                </td>
            </tr>
        `;

        return;

    }


    historyBody.innerHTML =
        history
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
   日付
========================================= */

function formatDate(value) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(
            value.replace(
                " ",
                "T"
            )
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

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

        await Promise.all([

            loadCampaign(),

            loadCoupons(),

            loadHistory()

        ]);

    } catch (error) {

        console.error(error);

        showMessage(
            error.message,
            true
        );

    }

}


/* =========================================
   データ更新
========================================= */

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


/* =========================================
   キャンペーン保存
========================================= */

saveCampaignButton.addEventListener(
    "click",
    saveCampaign
);


/* =========================================
   初期読み込み
========================================= */

loadAll();
