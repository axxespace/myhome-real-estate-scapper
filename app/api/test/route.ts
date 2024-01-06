import {NextResponse} from "next/server";
import puppeteer from "puppeteer";

export async function GET(request: Request) {
    // const strPrettify = (str: string | undefined) => {
    //     return str?.replace(/[\n\t]|მ²/g, '');
    // }

    let browser;

    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto("https://www.myhome.ge/ka/pr/17081379/");

        const title = await page.$eval('div.statement-title h1', h1 => h1.textContent?.trim());

        const address = await page.$eval('span.address', span => span.textContent?.trim());

        const description = await page.$eval('p.pr-comment', span => span.textContent?.trim());

        const priceGelValue = await page.$eval('span[data-price-gel]', span => span.getAttribute('data-price-gel'));

        // const cadastralNumber = await page.$eval('div.cadastral span', span => span.textContent?.trim());

        const mainFeatures = await page.$$eval('div.main-features', divs => {
            return divs.map(div => {
                const spans = div.querySelectorAll('span.d-block');
                return Array.from(spans).map(span => span.textContent?.trim());
            });
        });


        const ulElements = await page.$$('ul.amenities-ul');

        const list1Elements = await ulElements[0].$$eval('li', lis =>
            lis.map(li => {
                const span = li.querySelector('span');
                const externalSpan = li.querySelector('span.external-option');

                if (span && !span.classList.contains('no')) {
                    const text = span.textContent?.trim().replace(/[\n\t]|მ²/g, '');
                    const splitText = text?.match(/[^\d+]+|\d+\+?/g);
                    if (splitText)
                        return {name: splitText[0], value: externalSpan?.textContent?.trim() || splitText[1]};
                    return;
                }
            }).filter(Boolean)
        );

        const list2Elements = await ulElements[1].$$eval('li', lis =>
            lis.map(li => {
                const span = li.querySelector('span');
                const externalSpan = li.querySelector('span.external-option');

                if (span && !span.classList.contains('no')) {
                    const text = span.textContent?.trim().replace(/[\n\t]/g, '');
                    return {name: span?.textContent?.trim(), value: externalSpan?.textContent?.trim()};
                }
            }).filter(Boolean)
        );

        return NextResponse.json({
            list1: list1Elements,
            list2: list2Elements,
            title,
            address,
            description,
            priceGelValue,
            mainFeatures
        });
    } catch (error: any) {
        return NextResponse.json(
            {error: `An error occurred: ${error.message}`},
            {status: 200}
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}