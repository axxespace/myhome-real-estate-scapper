import {NextResponse} from "next/server";
import puppeteer from "puppeteer";
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';

export async function GET(request: Request) {
    // function hasCommonWord(string1: string, string2: string) {
    //     const words1 = string1.split(' ');
    //     const words2 = string2.split(' ');
    //
    //     for (let i = 0; i < words1.length; i++) {
    //         if (words2.includes(words1[i])) {
    //             return true; // Found a common item
    //         }
    //     }
    //     return false;
    // }
    let browser;


    try {
        //     const s3Client = new S3Client({
        //         region: process.env.BUCKET_REGION!,
        //         credentials: {
        //             accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        //             secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        //         }
        //     });
        //
        //     const uploadImageBufferToS3 = async (imageBuffer: Buffer, bucketName: string, fileName: string) => {
        //         const params = {
        //             Bucket: bucketName,
        //             Key: fileName,
        //             Body: imageBuffer
        //         };
        //
        //         const command = new PutObjectCommand(params);
        //
        //         try {
        //             await s3Client.send(command);
        //         } catch (err) {
        //             console.error('Error uploading file:', err);
        //             throw err;
        //         }
        //     };
        //
        browser = await puppeteer.launch({
            userDataDir: "./user_data",
            headless: false
        });

        const page = await browser.newPage();

        // page.on('response', async response => {
        //     const url = response.url();
        //     if (response.request().resourceType() === 'image') {
        //         const contentType = response.headers()['content-type'];
        //         if (contentType && contentType.toLowerCase().includes('image/jpeg')) {
        //             response.buffer().then(buffer => {
        //                 const fileName = url.split('/').pop();
        //                 if (fileName && /\d{8}/.test(fileName)) {
        //                     uploadImageBufferToS3(buffer, process.env.BUCKET_NAME!, fileName)
        //                         .then(uploadedUrl => {
        //                             console.log('Uploaded URL:', uploadedUrl);
        //                         })
        //                         .catch(err => {
        //                             console.error('Error:', err);
        //                         });
        //
        //                 }
        //             });
        //         }
        //     }
        // });

        await page.goto("https://www.myhome.ge/ka/pr/16517315/iyideba-mshenebare-bina-goZiashvilis-I-shes.-goZiashvilis-I-shes.-2-oTaxiani");

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

        await page.goto("https://www.myhome.ge/ka/");

        const anchorText = 'დამატება'; // Text content to search within <a> elements

        await page.waitForXPath(`//a[contains(text(), "${anchorText}")]`); // Wait for <a> element with specified text

        await page.evaluate((searchText) => {
            const anchors = Array.from(document.querySelectorAll('a'));

            const anchorWithText = anchors.find((a) => a.textContent?.includes(searchText));

            if (anchorWithText) {
                anchorWithText.click();
            }
        }, anchorText);

        await page.waitForNavigation();

        const hasAuthSubstring = page.url().includes('auth');

        if (hasAuthSubstring) {
            await page.type('input#Email', 'nikaberidze78@gmail.com');
            await page.type('input#Password', 'Nomvln77!');
            const buttonText = 'შესვლა'; // Text content of the button

            await page.waitForXPath(`//button[contains(text(), "${buttonText}")]`); // Wait for the button to appear

            await page.evaluate((buttonText) => {
                const buttons = Array.from(document.querySelectorAll('button'));

                const buttonWithText = buttons.find((btn) => btn.textContent?.includes(buttonText));

                if (buttonWithText) {
                    buttonWithText.click();
                }
            }, buttonText);

            await page.waitForNavigation();
        }

        await page.waitForSelector('button#dropdownMenuButton');

        await page.click('button#dropdownMenuButton');

        await page.$$eval('div.property_container', (divs, title) => {
            return divs.map(div => {
                function hasCommonWord(string1: string, string2: string) {
                    const words1 = string1.split(' ');
                    const words2 = string2.split(' ');

                    for (let i = 0; i < words1.length; i++) {
                        if (words2.includes(words1[i])) {
                            return true; // Found a common item
                        }
                    }
                    return false;
                }

                const label = div.querySelector('label');
                if (label && hasCommonWord(label.textContent?.trim()!, title!)) {
                    label.click();
                }
            });
        }, title);

        await page.evaluate(async (text) => {
            const textsToClick = text?.split(' ')!;
            for (const textToClick of textsToClick) {
                const foundSpans = Array.from(document.querySelectorAll('span')).find(element => element.textContent?.trim() === textToClick);
                foundSpans?.click();
            }
        }, title);


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