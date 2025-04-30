#include "mainwindow.h"
#include "ui_mainwindow.h"
#include <QFile>
#include <QTextStream>
#include <QDateTime>
#include <QDir>
#include <QMessageBox>

#define LOG_FILE "timelog.txt"
#define REPORT_FOLDER "reports"

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::MainWindow)
{
    ui->setupUi(this);
    QDir().mkdir(REPORT_FOLDER); // Create reports folder
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::punch(const QString &action)
{
    username = ui->usernameEdit->text();
    if (username.isEmpty()) {
        QMessageBox::warning(this, "Input Error", "Please enter your username.");
        return;
    }

    QFile file(LOG_FILE);
    if (!file.open(QIODevice::Append | QIODevice::Text)) {
        QMessageBox::critical(this, "Error", "Cannot open log file.");
        return;
    }

    QTextStream out(&file);
    QDateTime now = QDateTime::currentDateTime();
    out << username << " " << action << " - " << now.toString("dd/MM/yyyy HH:mm:ss") << "\n";
    file.close();

    ui->logOutput->append("Punched " + action + " at " + now.toString());
}

void MainWindow::view_log()
{
    username = ui->usernameEdit->text();
    if (username.isEmpty()) {
        QMessageBox::warning(this, "Input Error", "Please enter your username.");
        return;
    }

    QFile file(LOG_FILE);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QMessageBox::critical(this, "Error", "Cannot open log file.");
        return;
    }

    QTextStream in(&file);
    QString today = QDate::currentDate().toString("dd/MM/yyyy");

    ui->logOutput->clear();
    while (!in.atEnd()) {
        QString line = in.readLine();
        if (line.contains(username) && line.contains(today)) {
            ui->logOutput->append(line);
        }
    }
    file.close();
}

void MainWindow::weekly_summary()
{
    username = ui->usernameEdit->text();
    if (username.isEmpty()) {
        QMessageBox::warning(this, "Input Error", "Please enter your username.");
        return;
    }

    // Placeholder, you could implement week checking similar to your C code
    ui->logOutput->append("Weekly summary feature is under construction.");
}

void MainWindow::on_punchInButton_clicked()
{
    punch("IN");
}

void MainWindow::on_punchOutButton_clicked()
{
    punch("OUT");
}

void MainWindow::on_viewLogButton_clicked()
{
    view_log();
}

void MainWindow::on_weeklySummaryButton_clicked()
{
    weekly_summary();
}
