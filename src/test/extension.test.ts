// Note: This test is leveraging the Mocha test framework (https://mochajs.org/)

import * as assert from 'assert';
import * as vscode from 'vscode';
import { Position, Range, TextEditorEdit, Selection, EndOfLine } from 'vscode';
import * as my from '../extension';


suite("sortLines()", () => {
    async function doTest(
        input: string,
        selections: Selection[],
        sortDescending: boolean) {

        // Set the test input text and the selection
        const editor = vscode.window.activeTextEditor!;
        await editor.edit((editBuilder: TextEditorEdit) => {
            const document = editor.document;
            const lastLine = document.lineAt(document.lineCount - 1);
            const entireRange = new Range(
                new Position(0, 0),
                lastLine.range.end
            );
            editBuilder.replace(entireRange, input);
        });
        editor.selections = selections;

        // Call the logic
        await my.sortLines(editor, sortDescending);

        // Return the result
        return editor.document.getText();
    }

    suiteSetup(async () => {
        const uri = vscode.Uri.parse("untitled:test.txt");
        const options = { preserveFocus: false };
        const editor = await vscode.window.showTextDocument(uri, options);
        await editor.edit(edit => {
            edit.setEndOfLine(EndOfLine.LF);
        });
    });

    suiteTeardown(async () => {
        const commandName = "workbench.action.closeAllEditors";
        await vscode.commands.executeCommand(commandName);
    });

    test("prerequesties", async () => {
        // full-icu package
        const halfWidthOne = "1";
        const fullWidthOne = "\uff11";
        assert.ok(
            halfWidthOne.localeCompare(fullWidthOne, "ja") === 0,
            "Locale aware string comparison failed." +
            " Full ICU data must be installed on the test environment. See" +
            " https://www.npmjs.com/package/full-icu"
        );
    });

    test("single selection", async () => {
        let result = await doTest(
            "a\n" +
            "c\n" +
            "b\n",
            [new Selection(0, 0, 3, 0)],
            false
        );
        assert.equal(result,
            "a\n" +
            "b\n" +
            "c\n"
        );

        result = await doTest(
            "aaa\n" +
            "aa\n" +
            "a\n",
            [new Selection(0, 0, 3, 0)],
            false
        );
        assert.equal(result,
            "a\n" +
            "aa\n" +
            "aaa\n"
        );
    });

    test("multiple selections", async () => {
        let result = await doTest(
            "Apple\n" +
            "Orange\n" +
            "Pineapple\n",
            [
                new Selection(0, 1, 0, 2),
                new Selection(1, 1, 1, 2),
                new Selection(2, 1, 2, 2),
            ],
            false
        );
        assert.equal(result,
            "Pineapple\n" +
            "Apple\n" +
            "Orange\n"
        );

        result = await doTest(
            "aaa\n" +
            "aa\n" +
            "a\n",
            [new Selection(0, 0, 3, 0)],
            false
        );
        assert.equal(result,
            "a\n" +
            "aa\n" +
            "aaa\n"
        );
    });

    test("descending order", async () => {
        let result = await doTest(
            "a\n" +
            "c\n" +
            "b\n",
            [new Selection(0, 0, 3, 0)],
            true
        );
        assert.equal(result,
            "c\n" +
            "b\n" +
            "a\n"
        );

        result = await doTest(
            "a\n" +
            "aa\n" +
            "aaa\n",
            [new Selection(0, 0, 3, 0)],
            true
        );
        assert.equal(result,
            "aaa\n" +
            "aa\n" +
            "a\n"
        );
    });

    test("empty line: exclude trailing one in a selection", async () => {
        let result = await doTest(
            "a\n" +
            "c\n" +
            "b\n" +
            "\n",
            [new Selection(0, 0, 3, 0)],
            false
        );
        assert.equal(result,
            "a\n" +
            "b\n" +
            "c\n" +
            "\n"
        );
    });

    test("empty line: include those selected by one of the multiple selections", async () => {
        let result = await doTest(
            "b\n" +
            "\n" +
            "a\n" +
            "\n",
            [
                new Selection(0, 0, 0, 1),
                new Selection(1, 0, 1, 0),
                new Selection(2, 0, 2, 1),
            ],
            false
        );
        assert.equal(result,
            "\n" +
            "a\n" +
            "b\n" +
            "\n"
        );
    });

    test("stability", async () => {
        // It seems that Array.prototype.sort() of Node.js uses stable sort
        // algorithm for a small collection so the test data must be large
        // enough to let Node use the unstable algorithm.
        // As of VSCode 1.27.2 (Node.js 8.9.3), N must be larger than 5.
        const N = 6;
        const input = Array<string>();
        for (let i = 0; i < N; i++) {
            input.push(String.fromCharCode('A'.charCodeAt(0) + N - 1 - i));
            input.push(String.fromCharCode('Ａ'.charCodeAt(0) + N - 1 - i));
        }

        const expected = Array<string>();
        for (let i = 0; i < N; i++) {
            expected.push(String.fromCharCode('A'.charCodeAt(0) + i));
            expected.push(String.fromCharCode('Ａ'.charCodeAt(0) + i));
        }

        let result = await doTest(
            input.join("\n") + "\n",
            [new Selection(0, 0, N * 2, 0)],
            false
        );
        assert.equal(result,
            expected.join("\n") + "\n"
        );
    });
});