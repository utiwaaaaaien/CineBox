import type { CameraSystemCheck } from "./camera-system-rules";
import { systemRuleReview } from "./system-rule-review-data";

export function SystemRuleReview({ checks }: { checks: readonly CameraSystemCheck[] }) {
  const checksById = new Map(checks.map((check) => [check.id, check]));
  return (
    <details className="system-rule-review">
      <summary>
        <strong>审查全部配套规则</strong>
        <span>{systemRuleReview.length} 条</span>
      </summary>
      <div className="system-rule-review-body">
        <p>机位数量取项目设定和已选摄影机总数的较大值，至少按 1 个机位计算。下列数量是目标数量，同一器材被多条规则建议时按最高目标合并。</p>
        <p>「联动可补齐」表示换机身时可随联动方案加入。「联动时需人工核对」表示换机身时只作提示。通过器材单主动补齐的条目会标为待确认。</p>
        <ol className="system-rule-review-list">
          {systemRuleReview.map((rule) => {
            const check = checksById.get(rule.id);
            const state = !check ? "inactive" : check.missing.length ? "missing" : "covered";
            const status = !check ? "当前未触发" : check.missing.length ? `当前缺 ${check.missing.length} 项` : "当前已覆盖";
            return (
              <li key={rule.id}>
                <details>
                  <summary>
                    <strong>{rule.title}</strong>
                    <span className="system-rule-review-status" data-state={state}>{status}</span>
                  </summary>
                  <dl>
                    <dt>触发条件</dt><dd>{rule.when}</dd>
                    <dt>建议与数量</dt><dd>{rule.additions}</dd>
                    <dt>换机联动</dt>
                    <dd>{!rule.linked ? "联动时需人工核对" : check && !check.autoAdd ? "当前建议项不可全部联动加入" : "联动可补齐"}</dd>
                    {check && <><dt>项目核对</dt><dd>{check.detail}</dd></>}
                    {!!check?.missing.length && (
                      <><dt>本项目待补</dt>
                      <dd><ul>{check.missing.map((item) => <li key={item.id}>{item.label} · 目标数量 {item.qty}</li>)}</ul></dd></>
                    )}
                  </dl>
                </details>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}
