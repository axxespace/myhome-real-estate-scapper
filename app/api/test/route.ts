import {NextResponse} from "next/server";
import puppeteer from "puppeteer";
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';

export async function GET(request: Request) {
    let browser;

    try {
        const s3Client = new S3Client({
            region: process.env.BUCKET_REGION!,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
            }
        });

        const uploadImageBufferToS3 = async (imageBuffer: Buffer, bucketName: string, fileName: string) => {
            const params = {
                Bucket: bucketName,
                Key: fileName,
                Body: imageBuffer
            };

            const command = new PutObjectCommand(params);

            try {
                await s3Client.send(command);
                // console.log('File uploaded successfully:', response);
                // return `https://${bucketName}.s3.amazonaws.com/${fileName}`; // Construct URL
            } catch (err) {
                console.error('Error uploading file:', err);
                throw err;
            }
        };

        browser = await puppeteer.launch();
        const page = await browser.newPage();
        let counter = 0;
        page.on('response', async response => {
            const url = response.url();
            if (response.request().resourceType() === 'image') {
                const contentType = response.headers()['content-type'];
                if (contentType && contentType.toLowerCase().includes('image/jpeg')) {
                    response.buffer().then(buffer => {
                        const fileName = url.split('/').pop();
                        if (fileName && /\d{8}/.test(fileName)) {
                            uploadImageBufferToS3(buffer, process.env.BUCKET_NAME!, fileName)
                                .then(uploadedUrl => {
                                    console.log('Uploaded URL:', uploadedUrl);
                                })
                                .catch(err => {
                                    console.error('Error:', err);
                                });

                        }
                    });
                }
            }
        });

        await page.goto("https://www.myhome.ge/ka/pr/16135388/");

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