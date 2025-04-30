#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>

QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
QT_END_NAMESPACE

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void on_punchInButton_clicked();
    void on_punchOutButton_clicked();
    void on_viewLogButton_clicked();
    void on_weeklySummaryButton_clicked();

private:
    Ui::MainWindow *ui;
    QString username;
    void punch(const QString &action);
    void view_log();
    void weekly_summary();
};

#endif // MAINWINDOW_H
