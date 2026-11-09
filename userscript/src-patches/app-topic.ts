import {
    QuestionBankFacade,
    QuestionStatus,
    Question,
} from "./question";
import {Application} from "../application";
import {SystemConfig} from "@App/config";

// 查询任务中的题目,返回Question数组
export interface QueryQuestions {
    QueryQuestions(): Question[];
}

// 题目任务点
export abstract class Topic {
    protected lock: boolean;
    protected answer: QuestionBankFacade;
    protected context: any;
    protected queryQuestions: QueryQuestions;

    constructor(content: any, answer: QuestionBankFacade) {
        this.answer = answer;
        this.context = content;
    }

    public SetQueryQuestions(queryQuestions: QueryQuestions): void {
        this.queryQuestions = queryQuestions;
    }

    public abstract Init(): Promise<any>;

    protected addQuestion() {
        let questions = this.queryQuestions.QueryQuestions();
        this.answer.ClearQuestion();
        questions.forEach((val) => {
            this.answer.AddQuestion(val);
        });
    }

    public QueryAnswer(): Promise<QuestionStatus> {
        return new Promise<QuestionStatus>(resolve => {
            if (this.lock) {
                return resolve("processing");
            }
            this.lock = true;
            Application.App.log.Info("题目搜索中...");
            // 题目可能是异步渲染的，页面刚加载完时可能一道都取不到；
            // 先等题目出现，再开始作答，避免"0 道题"被当成答完直接跳过
            let tries = 0;
            let attempt = () => {
                this.addQuestion();
                let count = this.answer.GetQuestionCount ? this.answer.GetQuestionCount() : -1;
                if (count == 0 && tries < 12) {
                    tries++;
                    if (tries == 1) {
                        Application.App.log.Info("页面上暂时还没有题目，等待加载...");
                    }
                    setTimeout(attempt, 800);
                    return;
                }
                if (count <= 0) {
                    Application.App.log.Warn("等了约 10 秒仍没在页面上找到题目，跳过这个任务点");
                }
                this.answer.Answer((status: QuestionStatus) => {
                    this.lock = false;
                    resolve(status);
                    if (status == "network") {
                        return Application.App.log.Error("题库无法访问,请查看:" + SystemConfig.url);
                    } else if (status == "incomplete") {
                        return Application.App.log.Warn("题库答案不全,请手动填写操作");
                    }
                });
            };
            attempt();
        });
    }

    public CollectAnswer(): Promise<any> {
        return new Promise(resolve => {
            Application.App.log.Debug("收集题目答案", this.context);
            this.addQuestion();
            this.answer.Push((status: QuestionStatus) => {
                Application.App.log.Debug("采集答案返回", status);
                resolve();
            });
        });
    }

    public abstract Submit(): Promise<any>;

}