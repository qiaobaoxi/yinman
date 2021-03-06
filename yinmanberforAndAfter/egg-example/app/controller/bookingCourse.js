/**
 * 预约试课
 * Created by rhino on 2017-04-14.
 */
module.exports = app => {
  class BookingCourseController extends app.Controller {
    *
        saveBookingInfo() {
          const body = this.ctx.request.body;
          const student = yield this.service.student.getById(body.studentId);
          if (student == null) {
            this.fail('学生不存在');
            return;
          }
          const bookingCourse = yield this.service.bookingCourse.getByStudentId(body.studentId);
          if (bookingCourse) {
            this.fail('一个学生只能预约一次！');
            return;
          }
          const now = app.moment();
          const twoDaysLater = app.moment(now).add(1, 'days');
          for (let i = 0; i < body.times.length; i++) {
            const hopeTime = app.moment(body.times[i].date + ' ' + body.times[i].time);
            if (hopeTime < twoDaysLater) {
              this.fail('请提前24小时预约！');
              return;
            }
          }
          const user = yield this.ctx.service.user.getById(student.userId);
          const courseTableItem = yield this.ctx.service.courseTableItem.getById(body.courseTableItemId);
          if (user.publicOpenId) {
            yield this.ctx.service.wechat.bookingSuccess(student.name, courseTableItem.courseName, now.format('YYYY-MM-DD HH:mm:ss'), user.publicOpenId, student.id);
          }
          const bookingCourseId = yield this.service.bookingCourse.add(
                    body.courseTableItemId,
                    body.studentId,
                    now.format('YYYY-MM-DD HH:mm:ss'),
                    body.state,
                    body.requirementVlaue,
                    courseTableItem
                );
                // student.booking = 0;
          yield this.service.student.update(student);
          for (const item of app.config.admins) {
            if (item.publicOpenId) {
              if (item.isEnabled === 1) {
                yield this.ctx.service.wechat.bookingSuccessAdmin(courseTableItem.courseName, now.format('YYYY-MM-DD HH:mm:ss'), item.publicOpenId);
              }
            }
          }
          this.success();
        } *
            getBookingInfoToId() {
              const result = yield this.ctx.service.bookingCourse.getBookingInfoToId(this.ctx.request.query.studentId);
              this.ctx.body = result;

            } *
            getById() {
              const info = yield this.ctx.service.bookingCourse.getById(this.ctx.request.query.id);
              this.ctx.body = info;
            } *
            getAll() {
              const query = this.ctx.request.query;
              const result = yield this.ctx.service.bookingCourse.getAll(query.pageIndex, query.limit, query.state);
              this.ctx.body = result;

            } *
            getQueryList() {
              const result = yield this.ctx.service.bookingCourse.getQueryList(this.ctx.request.body.studentName, this.ctx.request.body.parentName, this.ctx.request.body.pageIndex, this.ctx.request.body.limit);
              this.ctx.body = result;

            } *
            delete() {
                // let id = this.ctx.request.body.curriculumId || 0;
                // let info = yield this.service.bookingCourse.getById(id);
                // if(info == null){
                //     this.ctx.body = {
                //         msg:'未找到记录',
                //         code: 0
                //     }
                //     return;
                // }
                // let count = yield this.service.bookingCourse.countByCurriculum();
                // if(count> 0){
                //     this.ctx.body = {
                //         msg:'当前用户已有人报名，无法删除',
                //         code: 0
                //     }
                //     return;
                // }
              const updateData = yield this.ctx.service.bookingCourse.delete(id);
              const result = {};
              if (updateData.affectedRows == 1) {
                result.msg = '删除成功';
                result.code = 1;
              } else {
                result.msg = '删除失败';
                result.code = 0;
              }
              this.ctx.body = result;
            }
            /**
             * 已确认操作
             */
    *
            confirm() {
              const { id, confirmedId, remarks } = this.ctx.request.body;
              const info = yield this.service.bookingCourse.getById(id);
                // if (info.state != '待确认') {
                //     this.fail('当前状态不是待确认状态');
                //     return;
                // }
              info.state = '已确认';
              info.confirmedId = confirmedId;
              info.remarks = remarks;
              if (!confirmedId) {
                this.fail('更改时间不能为空');
                return;
              }
              const student = yield this.ctx.service.student.getById(info.studentId);
              const courseTableItem = yield this.ctx.service.courseTableItem.getById(confirmedId);
              courseTableItem.course = yield this.ctx.service.course.getById(courseTableItem.courseName);
              const classroom = yield this.ctx.service.classroom.getById(courseTableItem.classroomId);
              const teacher = yield this.ctx.service.teacher.getById(courseTableItem.teacherId);
              const teacherUser = yield this.ctx.service.user.getById(teacher.userId);
              const classTime = app.moment(courseTableItem.date).format('YYYY.MM.DD') + ' ' + courseTableItem.startTime + '-' + courseTableItem.endTime;
              const user = yield this.ctx.service.user.getById(student.userId);
              yield this.service.bookingCourse.update(info);
              const list = yield this.ctx.service.bookingCourse.getByCourseTableItemId1(courseTableItem.id);
              if (courseTableItem.number == list.length) {
                courseTableItem.status = '';
                yield this.ctx.service.courseTableItem.update(courseTableItem);
              }
              yield this.service.wechat.bookingAuditingSuccess(2, student.name, courseTableItem.course.name, classroom.name, teacher.name, classTime, user.publicOpenId, student.id, teacherUser.publicOpenId);
              this.success();
            }
            /**
             * 已试听操作
             */
    *
            changeState() {
              const { id, state, remarks } = this.ctx.request.body;
              const info = yield this.service.bookingCourse.getById(id);
              info.state = '已' + state;
              info.remarks = remarks;
              yield this.service.bookingCourse.update(info);
              const student = yield this.ctx.service.student.getById(info.studentId);
              const courseTableItem = yield this.ctx.service.courseTableItem.getById(info.courseTableItemId);
              courseTableItem.course = yield this.ctx.service.course.getById(courseTableItem.courseName);        
              const classroom = yield this.ctx.service.classroom.getById(courseTableItem.classroomId);
              const teacher = yield this.ctx.service.teacher.getById(courseTableItem.teacherId);
              const classTime = app.moment(courseTableItem.date).format('YYYY.MM.DD') + ' ' + courseTableItem.startTime + '-' + courseTableItem.endTime;
              const user = yield this.ctx.service.user.getById(student.userId);
              const teacherUser = yield this.ctx.service.user.getById(teacher.userId);
              if (state === '确认') {
                yield this.service.wechat.bookingAuditingSuccess(1, student.name, courseTableItem.course.name, classroom.name, teacher.name, classTime, user.publicOpenId, student.id, teacherUser.publicOpenId);
                const sendTime = app.moment(app.moment(courseTableItem.date).subtract(1, 'days')).format('YYYY-MM-DD') + ' ' + courseTableItem.startTime;
                yield this.service.bookingWechat.add(info.id, sendTime);
                const list = yield this.ctx.service.bookingCourse.getByCourseTableItemId1(courseTableItem.id);
                if (courseTableItem.number == list.length) {
                  courseTableItem.status = '';
                  yield this.ctx.service.courseTableItem.update(courseTableItem);
                }
              } else {
                yield this.service.wechat.bookingAuditingFail(student.name, courseTableItem.course.name, classTime, user.publicOpenId, student.id);
              }
              this.success();
            } *
            listened() {
              const { id } = this.ctx.request.body;
              const info = yield this.service.bookingCourse.getById(id);
              if (info.state != '已确认') {
                this.fail('当前状态不是已确认状态');
                return;
              }
              info.state = '未试课';
              yield this.service.bookingCourse.update(info);
              this.success();
            } *
            cancel() {
              const { id } = this.ctx.request.body;
              const info = yield this.service.bookingCourse.getById(id);
              if (info.confirmedId || info.courseTableItemId) {
                const now = app.moment();
                let twoDaysLater = app.moment(now).add(1, 'days');
                twoDaysLater = new Date(twoDaysLater).getTime();
                const course = yield this.service.courseTableItem.getById(info.confirmedId || info.courseTableItemId);
                const hopeTime = new Date(app.moment(course.date).format('YYYY-MM-DD') + ' ' + course.startTime).getTime();
                if (hopeTime < twoDaysLater && info.state != '待确认') {
                  this.fail('24小时内不可取消;');
                  return;
                }
              }
              const student = yield this.ctx.service.student.getById(info.studentId);
              const user = yield this.ctx.service.user.getById(student.userId);
              let courseTableItem;
              if (info.confirmedId) {
                courseTableItem = yield this.ctx.service.courseTableItem.getById(info.confirmedId);
              } else {
                courseTableItem = yield this.ctx.service.courseTableItem.getById(info.courseTableItemId);
              }
              courseTableItem.course = yield this.ctx.service.course.getById(courseTableItem.courseName);
              const classTime = app.moment(courseTableItem.date).format('YYYY.MM.DD') + ' ' + courseTableItem.startTime + '~' + courseTableItem.endTime;
              if (info.state === '待确认') {
                yield this.ctx.service.wechat.bookingstartCancel1(student.name, courseTableItem.course.name, classTime, user.publicOpenId, student.id);
                for (const item of app.config.admins) {
                  if (item.publicOpenId) {
                    if (item.isEnabled === 1) {
                      yield this.ctx.service.wechat.bookingEndCancelAdmin(student.name, courseTableItem.course.name, classTime, item.publicOpenId);
                    }
                  }
                }
              } else if (info.state === '已确认') {
                const teacher = yield this.ctx.service.teacher.getById(courseTableItem.teacherId);
                const teacherUser = yield this.ctx.service.user.getById(teacher.userId);
                yield this.ctx.service.wechat.bookingEndCancel(student.name, courseTableItem.courseName, classTime, user.publicOpenId, student.id, teacherUser.publicOpenId, teacher.name);
                for (const item of app.config.admins) {
                  if (item.publicOpenId) {
                    if (item.isEnabled === 1) {
                      yield this.ctx.service.wechat.bookingEndCancelAdmin(student.name, courseTableItem.course.name, classTime, item.publicOpenId);
                    }
                  }
                }

              } else {
                this.fail('出错');
                return;
              }
              info.state = '已取消';
              courseTableItem.status = '空闲';
              yield this.ctx.service.courseTableItem.update(courseTableItem);
              yield this.service.bookingCourse.update(info);
              this.success();
            } *
            backEndCancel() {
              const { id } = this.ctx.request.body;
              const info = yield this.service.bookingCourse.getById(id);
              info.state = '已取消';
              yield this.service.bookingCourse.update(info);
              const student = yield this.ctx.service.student.getById(info.studentId);
              const user = yield this.ctx.service.user.getById(student.userId);
              let courseTableItem;
              if (info.confirmedId) {
                courseTableItem = yield this.ctx.service.courseTableItem.getById(info.confirmedId);
              } else {
                courseTableItem = yield this.ctx.service.courseTableItem.getById(info.courseTableItemId);
              }
              courseTableItem.course = yield this.ctx.service.course.getById(courseTableItem.courseName);
              const teacher = yield this.ctx.service.teacher.getById(courseTableItem.teacherId);
              const teacherUser = yield this.ctx.service.user.getById(teacher.userId);
              const classTime = app.moment(courseTableItem.date).format('YYYY.MM.DD') + ' ' + courseTableItem.startTime + '-' + courseTableItem.endTime;
              yield this.ctx.service.wechat.bookingEndCancel(student.name, courseTableItem.course.name, classTime, user.publicOpenId, student.id, teacherUser.publicOpenId, teacher.name);
              courseTableItem.status = '空闲';
              yield this.ctx.service.courseTableItem.update(courseTableItem);
              for (const item of app.config.admins) {
                if (item.publicOpenId) {
                  if (item.isEnabled === 1) {
                    yield this.ctx.service.wechat.bookingEndCancelAdmin(student.name, courseTableItem.course.name, classTime, item.publicOpenId);
                  }
                }
              }
              this.success();
            }
    }
  return BookingCourseController;
};
