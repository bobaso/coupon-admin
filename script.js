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
    document.getElementById(
        "couponStatsBody"
    );
const couponStatsHead =
    document.getElementById(
        "couponStatsHead"
    );
const reloadStatsButton =
    document.getElementById(
        "reloadStatsButton"
    );


/* =========================================
   データ
========================================= */

let coupons = [];

let historyData = [];

let historyFilter = "all";

let statsPeriod = "month";

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
        event.target.value
            .replace("等", "");

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
    `${String(coupon.rank).replace("等", "").trim()}等`,

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



historyData =
    data.history || [];

renderHistory();

/*
 * 発券状況も更新
 */

renderCouponStats();



}

/* =========================================
   開催期間内の月一覧
========================================= */

function getCampaignMonths() {

    if (
        !startDate.value ||
        !endDate.value
    ) {

        return [];

    }


    const start =
        new Date(
            startDate.value + "T00:00:00"
        );

    const end =
        new Date(
            endDate.value + "T00:00:00"
        );


    if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
    ) {

        return [];

    }


    const months = [];


    const current =
        new Date(
            start.getFullYear(),
            start.getMonth(),
            1
        );


    const last =
        new Date(
            end.getFullYear(),
            end.getMonth(),
            1
        );


    while (current <= last) {

        months.push({

            year:
                current.getFullYear(),

            month:
                current.getMonth(),

            label:
                `${current.getFullYear()}年${current.getMonth() + 1}月`

        });


        current.setMonth(
            current.getMonth() + 1
        );

    }


    return months;

}


/* =========================================
   指定月の発券数
========================================= */

function getMonthlyIssuedCount(
    couponId,
    year,
    month
) {

    return historyData.filter(
        item => {

            /*
             * クーポンID
             */

            if (
                Number(item.coupon_id) !==
                Number(couponId)
            ) {

                return false;

            }


            /*
             * 発券日時がない
             */

            if (!item.issued_at) {

                return false;

            }


            /*
             * 発券日時をDate化
             */

 const issuedJapanTime =
    parseJapanDate(
        item.issued_at
    );


if (!issuedJapanTime) {

    return false;

}


/*
 * 指定された年月か確認
 */

return (
    issuedJapanTime.getFullYear() ===
        year &&
    issuedJapanTime.getMonth() ===
        month
);
/* =========================================
   1週間：曜日別発券数
========================================= */

function getWeeklyIssuedCounts(
    couponId
) {

    const now =
        new Date();


    /*
     * 日本時間の現在時刻
     */

    const currentTime =
        new Date(
            now.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Tokyo"
                }
            )
        );


    /*
     * 今日を含む過去7日間
     */

    const startTime =
        new Date(currentTime);


    startTime.setDate(
        startTime.getDate() - 6
    );


    startTime.setHours(
        0,
        0,
        0,
        0
    );


    /*
     * 曜日ごとの発券数
     *
     * 0 = 日曜日
     * 1 = 月曜日
     * 2 = 火曜日
     * ...
     * 6 = 土曜日
     */

    const counts = {

        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0

    };


    /*
     * 発券履歴を確認
     */

    historyData.forEach(
        item => {

            /*
             * クーポンID
             */

            if (
                Number(item.coupon_id) !==
                Number(couponId)
            ) {

                return;

            }


            /*
             * 発券日時がない
             */

            if (!item.issued_at) {

                return;

            }


            /*
             * 日時変換
             */

const issuedJapanTime =
    parseJapanDate(
        item.issued_at
    );


if (!issuedJapanTime) {

    return;

}

            /*
             * 過去7日間のみ
             */

            if (
                issuedJapanTime <
                startTime ||
                issuedJapanTime >
                currentTime
            ) {

                return;

            }


            /*
             * 曜日を取得
             */

            const day =
                issuedJapanTime.getDay();


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


    /* =====================================
       キャンペーン期間の月一覧
    ====================================== */

    const campaignMonths =
        getCampaignMonths();


    /* =====================================
       キャンペーン期間未設定
    ====================================== */

    if (
        !startDate.value ||
        !endDate.value
    ) {

        couponStatsHead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>等級</th>
                <th>賞品</th>
                <th>発券枚数</th>
                <th>残り枚数</th>
            </tr>
        `;


        couponStatsBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="loading"
                >
                    キャンペーン期間を設定してください。
                </td>
            </tr>
        `;

        return;

    }


    /* =====================================
       今日
    ====================================== */

    if (
        statsPeriod === "today"
    ) {

        renderStatsToday();

        return;

    }


    /* =====================================
       1週間
    ====================================== */

    if (
        statsPeriod === "week"
    ) {

        renderStatsWeek();

        return;

    }


    /* =====================================
       1ヶ月
    ====================================== */

    if (
        statsPeriod === "month"
    ) {

        renderStatsMonth(
            campaignMonths
        );

        return;

    }


    /* =====================================
       全期間
    ====================================== */

    if (
        statsPeriod === "all"
    ) {

        renderStatsAll();

        return;

    }

}


/* =========================================
   今日の発券数
========================================= */

function getTodayIssuedCount(
    couponId
) {

    const now =
        new Date();


    const japanNow =
        new Date(
            now.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Tokyo"
                }
            )
        );


    const todayStart =
        new Date(
            japanNow
        );


    todayStart.setHours(
        0,
        0,
        0,
        0
    );


    const todayEnd =
        new Date(
            japanNow
        );


    todayEnd.setHours(
        23,
        59,
        59,
        999
    );


    return historyData.filter(
        item => {

            if (
                Number(item.coupon_id) !==
                Number(couponId)
            ) {

                return false;

            }


            if (!item.issued_at) {

                return false;

            }


const issuedJapanTime =
    parseJapanDate(
        item.issued_at
    );


if (!issuedJapanTime) {

    return false;

}


            return (
                issuedJapanTime >=
                    todayStart &&
                issuedJapanTime <=
                    todayEnd
            );

        }
    ).length;

}


/* =========================================
   1週間の発券数
========================================= */

function getWeekdayIssuedCounts(
    couponId
) {

    const now =
        new Date();


    const currentTime =
        new Date(
            now.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Tokyo"
                }
            )
        );


    /*
     * 今日
     */

    const today =
        new Date(
            currentTime
        );


    today.setHours(
        23,
        59,
        59,
        999
    );


    /*
     * 6日前
     */

    const startTime =
        new Date(
            currentTime
        );


    startTime.setDate(
        startTime.getDate() - 6
    );


    startTime.setHours(
        0,
        0,
        0,
        0
    );


    /*
     * 曜日別
     *
     * 0 = 日
     * 1 = 月
     * 2 = 火
     * 3 = 水
     * 4 = 木
     * 5 = 金
     * 6 = 土
     */

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


            if (!item.issued_at) {

                return;

            }


const issuedJapanTime =
    parseJapanDate(
        item.issued_at
    );


if (!issuedJapanTime) {

    return;

}

            if (
                issuedJapanTime <
                    startTime ||
                issuedJapanTime >
                    today
            ) {

                return;

            }


            const day =
                issuedJapanTime.getDay();


            counts[day]++;

        }
    );


    return counts;

}


/* =========================================
   今日
========================================= */

function renderStatsToday() {

    couponStatsHead.innerHTML = `
        <tr>
            <th>ID</th>
            <th>等級</th>
            <th>賞品</th>
            <th>今日</th>
            <th>残り</th>
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

                    const count =
                        getTodayIssuedCount(
                            coupon.id
                        );


                    return createStatsRow(
                        coupon,
                        [count]
                    );

                }
            )
            .join("");

}


/* =========================================
   1週間
========================================= */

function renderStatsWeek() {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>月</th>

            <th>火</th>

            <th>水</th>

            <th>木</th>

            <th>金</th>

            <th>土</th>

            <th>日</th>

            <th>合計</th>

            <th>残り</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        couponStatsBody.innerHTML = `
            <tr>
                <td
                    colspan="12"
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

                    const counts =
                        getWeekdayIssuedCounts(
                            coupon.id
                        );


                    const monday =
                        counts[1];

                    const tuesday =
                        counts[2];

                    const wednesday =
                        counts[3];

                    const thursday =
                        counts[4];

                    const friday =
                        counts[5];

                    const saturday =
                        counts[6];

                    const sunday =
                        counts[0];


                    const total =
                        monday +
                        tuesday +
                        wednesday +
                        thursday +
                        friday +
                        saturday +
                        sunday;


                    return `

                        <tr>

                            <td>
                                ${Number(
                                    coupon.id
                                )}
                            </td>

                            <td>
                                ${createStatsRankHTML(
                                    coupon
                                )}
                            </td>

                            <td>
                                ${createStatsNameHTML(
                                    coupon
                                )}
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${monday}
                                </strong>
                           
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${tuesday}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${wednesday}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${thursday}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${friday}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${saturday}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${sunday}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${total}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-stock"
                                >
                                    ${Number(
                                        coupon.stock
                                    )}
                                </strong>
                                
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================
   1ヶ月
   キャンペーン期間の月ごとに表示
========================================= */

function renderStatsMonth(
    campaignMonths
) {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            ${campaignMonths
                .map(
                    month => `
                        <th>
                            ${month.month + 1}月
                        </th>
                    `
                )
                .join("")}

            <th>合計</th>

            <th>残り</th>

        </tr>
    `;


    if (
        coupons.length === 0
    ) {

        couponStatsBody.innerHTML = `
            <tr>
                <td
                    colspan="${
                        6 +
                        campaignMonths.length
                    }"
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

                    let total = 0;


                    const monthlyHTML =
                        campaignMonths
                            .map(
                                month => {

                                    const count =
                                        getMonthlyIssuedCount(
                                            coupon.id,
                                            month.year,
                                            month.month
                                        );


                                    total += count;


                                    return `
                                        <td>

                                            <strong
                                                class="stats-issued"
                                            >
                                                ${count}
                                            </strong>
                                            

                                        </td>
                                    `;

                                }
                            )
                            .join("");


                    return `

                        <tr>

                            <td>
                                ${Number(
                                    coupon.id
                                )}
                            </td>

                            <td>
                                ${createStatsRankHTML(
                                    coupon
                                )}
                            </td>

                            <td>
                                ${createStatsNameHTML(
                                    coupon
                                )}
                            </td>

                            ${monthlyHTML}

                            <td>
                                <strong
                                    class="stats-issued"
                                >
                                    ${total}
                                </strong>
                                
                            </td>

                            <td>
                                <strong
                                    class="stats-stock"
                                >
                                    ${Number(
                                        coupon.stock
                                    )}
                                </strong>
                                
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

function renderStatsAll() {

    couponStatsHead.innerHTML = `
        <tr>

            <th>ID</th>

            <th>等級</th>

            <th>賞品</th>

            <th>全期間</th>

            <th>残り</th>

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

                    const total =
                        historyData.filter(
                            item =>
                                Number(
                                    item.coupon_id
                                ) ===
                                Number(
                                    coupon.id
                                )
                        ).length;


                    return createStatsRow(
                        coupon,
                        [total]
                    );

                }
            )
            .join("");

}


/* =========================================
   発券状況 共通行
========================================= */

function createStatsRow(
    coupon,
    issuedCounts
) {

    const issuedHTML =
        issuedCounts
            .map(
                count => `
                    <td>

                        <strong
                            class="stats-issued"
                        >
                            ${count}
                        </strong>
                        

                    </td>
                `
            )
            .join("");


    return `

        <tr>

            <td>
                ${Number(
                    coupon.id
                )}
            </td>

            <td>
                ${createStatsRankHTML(
                    coupon
                )}
            </td>

            <td>
                ${createStatsNameHTML(
                    coupon
                )}
            </td>

            ${issuedHTML}

            <td>
                <strong
                    class="stats-stock"
                >
                    ${Number(
                        coupon.stock
                    )}
                </strong>
                
            </td>

        </tr>

    `;

}


/* =========================================
   等級HTML
========================================= */

function createStatsRankHTML(
    coupon
) {

    let designClass =
        "rank-3";


    if (
        coupon.rank === "1等"
    ) {

        designClass =
            "rank-1";

    } else if (
        coupon.rank === "2等"
    ) {

        designClass =
            "rank-2";

    }


    return `
        <span
            class="stats-rank ${designClass}"
        >
            ${escapeHTML(
                coupon.rank
            )}
        </span>
    `;

}


/* =========================================
   賞品名HTML
========================================= */

function createStatsNameHTML(
    coupon
) {

    return `
        <span
            class="stats-name"
        >
            ${escapeHTML(
                coupon.name
            )}
        </span>
    `;

}

/* =========================================
   発券履歴表示
========================================= */

function renderHistory() {

    let filteredHistory;


    /* =====================================
       フィルター
    ====================================== */

    if (historyFilter === "unused") {

        filteredHistory =
            historyData.filter(
                item =>
                    Number(item.used) !== 1
            );

    } else if (
        historyFilter === "used"
    ) {

        filteredHistory =
            historyData.filter(
                item =>
                    Number(item.used) === 1
            );

    } else {

        filteredHistory =
            historyData;

    }


    /* =====================================
       データなし
    ====================================== */

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


    /* =====================================
       表示
    ====================================== */

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

                /*
                 * 選択中ボタン変更
                 */

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


                /*
                 * フィルター変更
                 */

                historyFilter =
                    button.dataset.filter;


                /*
                 * 再表示
                 */

                renderHistory();

            }
        );

    });

/* =========================================
   日付
   D1に保存されている日本時間をそのまま表示
========================================= */

function formatDate(value) {

    if (!value) {

        return "-";

    }

    const dateString =
        String(value).trim();


    /*
     * D1には日本時間として保存されているため
     *
     * 例：
     * 2026-09-01 15:30:00
     *
     * ↓
     * 2026-09-01T15:30:00+09:00
     *
     * として解釈する
     */

    let dateStringWithTimezone =
        dateString;


    if (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(
            dateString
        )
    ) {

        dateStringWithTimezone =
            dateString.replace(
                " ",
                "T"
            ) + "+09:00";

    }


    const date =
        new Date(
            dateStringWithTimezone
        );


    /*
     * 日付として認識できない場合
     */

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    /*
     * 日本時間で表示
     */

    return date.toLocaleString(
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
                "2-digit",

            second:
                "2-digit"

        }
    );

}
/* =========================================
   日本時間として日時を取得
   D1には日本時間で保存されている前提
========================================= */

function parseJapanDate(value) {

    if (!value) {

        return null;

    }


    const dateString =
        String(value).trim();


    /*
     * 2026-09-01 15:30:00
     * ↓
     * 2026-09-01T15:30:00+09:00
     */

    if (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(
            dateString
        )
    ) {

        const date =
            new Date(
                dateString.replace(
                    " ",
                    "T"
                ) + "+09:00"
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


    /*
     * その他の形式
     */

    const date =
        new Date(
            dateString
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

/* =========================================
   発券状況 更新ボタン
========================================= */

if (reloadStatsButton) {

    reloadStatsButton.addEventListener(
        "click",
        async function () {

            reloadStatsButton.disabled = true;

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

                reloadStatsButton.disabled = false;

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
                 * 選択期間を変更
                 */

                statsPeriod =
                    this.dataset.statsPeriod;


                /*
                 * ボタンの選択状態を変更
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
                 * 発券状況を再表示
                 */

                renderCouponStats();

            }
        );

    }
);


/* =========================================
   管理カテゴリ切り替え
========================================= */

const adminCategoryButtons =
    document.querySelectorAll(
        ".admin-category-button"
    );

const adminCategoryContents =
    document.querySelectorAll(
        ".admin-category-content"
    );


/* =========================================
   カテゴリー表示
========================================= */

function renderAdminCategory(
    category
) {

    /*
     * ボタン
     */

    adminCategoryButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.category === category
            );

        }
    );


    /*
     * コンテンツ
     */

    adminCategoryContents.forEach(
        content => {

            content.classList.toggle(
                "is-hidden",
                content.dataset.categoryContent !== category
            );

        }
    );

}


/* =========================================
   カテゴリーボタン
========================================= */

adminCategoryButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                const category =
                    button.dataset.category;

                renderAdminCategory(
                    category
                );

            }
        );

    }
);


/* =========================================
   初期表示
   発券データ
========================================= */

renderAdminCategory("stats");
