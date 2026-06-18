import unittest

from app.services.analysis.experiment_detection import remove_experiment_section


class RemoveExperimentSectionTests(unittest.TestCase):
    def test_removes_empty_section_and_renumbers_summary(self):
        answer = """## 1. 비교표

내용

## 4. 실험 결과 비교

| 지표 | 논문 A | 논문 B |
|---|---|---|
| Accuracy | 문서에서 확인되지 않음 | 문서에서 확인되지 않음 |
| F1 | 없음 | 제공되지 않음 |

## 5. 최종 요약

요약"""

        cleaned = remove_experiment_section(answer, only_if_empty=True)

        self.assertNotIn("실험 결과 비교", cleaned)
        self.assertNotIn("## 5. 최종 요약", cleaned)
        self.assertIn("## 4. 최종 요약", cleaned)

    def test_keeps_section_with_a_real_metric_value(self):
        answer = """## 4. 실험 결과 비교

| 지표 | 논문 A | 논문 B |
|---|---|---|
| Accuracy | 91.2% | 문서에서 확인되지 않음 |

## 5. 최종 요약

요약"""

        cleaned = remove_experiment_section(answer, only_if_empty=True)

        self.assertIn("## 4. 실험 결과 비교", cleaned)
        self.assertIn("91.2%", cleaned)
        self.assertIn("## 5. 최종 요약", cleaned)

    def test_forced_removal_ignores_metric_value(self):
        answer = """4. 실험 결과 비교
Accuracy: 91.2%

5. 최종 요약
요약"""

        cleaned = remove_experiment_section(answer)

        self.assertNotIn("실험 결과 비교", cleaned)
        self.assertIn("4. 최종 요약", cleaned)

    def test_renumbers_summary_when_model_omits_section_but_keeps_five(self):
        answer = """## 3. 차이점
내용

## 5. 최종 요약
요약"""

        cleaned = remove_experiment_section(answer, only_if_empty=True)

        self.assertNotIn("## 5. 최종 요약", cleaned)
        self.assertIn("## 4. 최종 요약", cleaned)


if __name__ == "__main__":
    unittest.main()
