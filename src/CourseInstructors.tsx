import { GraduationCap, UsersRound } from 'lucide-react';
import { useLoad } from './components';
import { check, db, demo } from './lib';
import './course-instructors.css';

type Instructor = { full_name: string };
async function loadInstructors(): Promise<Instructor[]> {
  if (demo) return [];
  return check(await db().rpc('list_public_instructors')) as Instructor[];
}
export function CourseInstructors() {
  const { data, loading, error, refresh } = useLoad(loadInstructors);
  return (
    <section
      className="content-section course-instructors"
      aria-labelledby="course-instructors-heading"
    >
      <h2 className="info-heading" id="course-instructors-heading">
        <UsersRound size={22} aria-hidden="true" />
        Đội ngũ giảng viên
      </h2>
      <p className="course-instructors-intro">
        Những người đồng hành trong không gian học tập của bạn.
      </p>
      {loading ? (
        <p className="muted" role="status">
          Đang tải thông tin giảng viên…
        </p>
      ) : error ? (
        <div className="instructor-status" role="status">
          Thông tin giảng viên hiện chưa tải được.{' '}
          <button type="button" onClick={refresh}>
            Thử lại
          </button>
        </div>
      ) : !data?.length ? (
        <p className="muted">Thông tin giảng viên đang được cập nhật.</p>
      ) : (
        <div className="course-instructors-grid">
          {data.map((instructor, index) => (
            <article className="course-instructor" key={`${instructor.full_name}-${index}`}>
              <div className="course-instructor-avatar" aria-hidden="true">
                {instructor.full_name
                  .trim()
                  .split(/\s+/)
                  .slice(-2)
                  .map((word) => Array.from(word)[0])
                  .join('')
                  .toLocaleUpperCase('vi')}
              </div>
              <div>
                <h3>{instructor.full_name}</h3>
                <span>
                  <GraduationCap size={15} aria-hidden="true" /> Giảng viên
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
