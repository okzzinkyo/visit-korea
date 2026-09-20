import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import styles from './LegalPage.module.css';

interface Section {
  heading: string;
  body: string[];
}

interface LegalContent {
  title: string;
  updatedAt: string;
  sections: Section[];
}

const CONTENT: Record<string, LegalContent> = {
  terms: {
    title: '이용약관',
    updatedAt: '2026-09-20',
    sections: [
      {
        heading: '제1조 (목적)',
        body: [
          '이 약관은 부산 눈치게임(이하 "서비스")이 제공하는 부산 관광지 혼잡도 예보 및 추천 정보 이용과 관련한 조건을 정합니다.',
        ],
      },
      {
        heading: '제2조 (서비스의 성격)',
        body: [
          '서비스는 별도의 회원가입 없이 누구나 이용할 수 있으며, 공공데이터를 기반으로 산출한 예측 혼잡도·추천 정보를 제공합니다.',
        ],
      },
      {
        heading: '제3조 (예측 정보의 한계 및 면책)',
        body: [
          '서비스가 제공하는 혼잡도 예보는 공공 오픈API의 예측치를 가공한 참고 정보이며, 실제 방문 시점의 혼잡 상황과 다를 수 있습니다.',
          '서비스는 예측 정보의 정확성을 보장하지 않으며, 이를 신뢰하여 내린 이용자의 방문·일정 결정으로 발생한 손해에 대해 책임을 지지 않습니다.',
        ],
      },
      {
        heading: '제4조 (금지 행위)',
        body: [
          '이용자는 서비스가 제공하는 정보를 비정상적인 방법(자동화된 대량 수집 등)으로 수집·재배포해서는 안 됩니다.',
        ],
      },
      {
        heading: '제5조 (준거법)',
        body: ['이 약관은 대한민국 법령에 따라 해석·적용됩니다.'],
      },
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    updatedAt: '2026-09-20',
    sections: [
      {
        heading: '1. 개인정보 수집 여부',
        body: [
          '서비스는 회원가입·로그인 없이 이용할 수 있으며, 이름·연락처 등 개인을 식별하는 정보를 별도로 수집하지 않습니다.',
        ],
      },
      {
        heading: '2. 처리되는 정보',
        body: [
          '서비스 이용 중 접속 로그(IP 주소, 접속 일시, 브라우저 정보)가 서버 운영 과정에서 자동으로 생성·보관될 수 있습니다.',
          '지도 기능은 카카오맵 SDK를 통해 제공되며, 이 과정에서 카카오의 자체 정책에 따라 접속 정보가 처리될 수 있습니다.',
        ],
      },
      {
        heading: '3. 이용 목적',
        body: ['수집되는 접속 정보는 서비스 안정적 운영, 부정 이용 방지 목적 외에는 사용하지 않습니다.'],
      },
    ],
  },
  'open-data': {
    title: '오픈데이터 출처',
    updatedAt: '2026-09-20',
    sections: [
      {
        heading: '이 서비스는 아래 공공데이터·오픈API를 활용합니다.',
        body: [
          '한국관광공사 — 관광지 집중률 방문자 추이 예측 정보 API',
          '한국관광공사 — 관광지별 연관 관광지 정보 API',
          '한국관광공사 — 국문 관광정보 서비스 API',
          '부산광역시 — 축제정보서비스 API',
          '카카오 — 카카오맵 API',
        ],
      },
      {
        heading: '안내',
        body: [
          '각 공공데이터의 저작권 및 이용조건은 원 제공기관(공공데이터포털, 한국관광공사, 부산광역시)의 정책을 따릅니다.',
        ],
      },
    ],
  },
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? CONTENT[slug] : undefined;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.content}>
        {content ? (
          <>
            <h1 className={styles.title}>{content.title}</h1>
            <p className={styles.updatedAt}>최종 업데이트: {content.updatedAt}</p>
            {content.sections.map((section) => (
              <section key={section.heading} className={styles.section}>
                <h2 className={styles.heading}>{section.heading}</h2>
                {section.body.map((line) => (
                  <p key={line} className={styles.body}>{line}</p>
                ))}
              </section>
            ))}
          </>
        ) : (
          <p className={styles.body}>페이지를 찾을 수 없습니다.</p>
        )}
        <Link to="/" className={styles.backLink}>← 메인으로</Link>
      </main>
    </div>
  );
}
