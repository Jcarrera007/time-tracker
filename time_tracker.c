#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>

#define LOG_FILE "timelog.txt"
#define REPORT_FOLDER "reports"
#define REPORT_FILE_FORMAT REPORT_FOLDER "/report_%s.txt"

void punch(const char *username, const char *action);
void view_log(const char *username);
void export_report(const char *username, double total_hours);
void weekly_summary(const char *username);
double calculate_hours(int in_hour, int in_min, int in_sec, int out_hour, int out_min, int out_sec);
void print_colored(const char *text, const char *color);

int main()
{
	int choice;
	char username[50];

	mkdir(REPORT_FOLDER);

	printf("Enter your username: ");
	fgets(username, sizeof(username), stdin);
	username[strcspn(username, "\n")] = '\0';

	while (1)
	{
		printf("\033[1;36m\n=== Time Tracker (%s) ===\033[0m\n", username);
		printf("1. Punch In\n");
		printf("2. Punch Out\n");
		printf("3. View Today's Log\n");
		printf("4. View Weekly Summary\n");
		printf("5. Exit\n");
		printf("Select an option: ");

		if (scanf("%d", &choice) != 1)
		{
			printf("Invalid input. Exiting.\n");
			break;
		}

		getchar();

		switch (choice)
		{
			case 1:
				punch(username, "IN");
				break;
			case 2:
				punch(username, "OUT");
				break;
			case 3:
				view_log(username);
				break;
			case 4:
				weekly_summary(username);
				break;
			case 5:
				printf("Goodbye!\n");
				exit(0);
			default:
				printf("Invalid option. Try again.\n");
		}
	}

	return 0;
}

void punch(const char *username, const char *action)
{
	FILE *file = fopen(LOG_FILE, "a");
	if (!file)
	{
		perror("Error opening log file");
		return;
	}

	time_t now = time(NULL);
	struct tm *t = localtime(&now);

	if (t == NULL)
	{
		perror("localtime error");
		fclose(file);
		return;
	}

	fprintf(file, "%s %s - %02d/%02d/%04d %02d:%02d:%02d\n",
			username,
			action,
			t->tm_mday,
			t->tm_mon + 1,
			t->tm_year + 1900,
			t->tm_hour,
			t->tm_min,
			t->tm_sec);

	fclose(file);

	if (strcmp(action, "IN") == 0)
		print_colored("Punched IN successfully!\n", "\033[1;32m");
	else
		print_colored("Punched OUT successfully!\n", "\033[1;31m");
}

void view_log(const char *username)
{
	FILE *file = fopen(LOG_FILE, "r");
	if (!file)
	{
		perror("Error opening log file");
		return;
	}

	time_t now = time(NULL);
	struct tm *today = localtime(&now);
	char line[256];

	printf("\033[1;34m\n--- Today's Log for %s ---\033[0m\n", username);

	int in_hour = -1, in_min = -1, in_sec = -1;
	double total_hours = 0.0;

	while (fgets(line, sizeof(line), file))
	{
		char file_username[50];
		char action[10];
		int day, month, year, hour, min, sec;

		if (sscanf(line, "%49s %9s - %d/%d/%d %d:%d:%d",
					file_username, action, &day, &month, &year, &hour, &min, &sec) == 8)
		{
			if (strcmp(file_username, username) == 0 &&
					day == today->tm_mday &&
					month == today->tm_mon + 1 &&
					year == today->tm_year + 1900)
			{
				printf("%s", line);

				if (strcmp(action, "IN") == 0)
				{
					in_hour = hour;
					in_min = min;
					in_sec = sec;
				}
				else if (strcmp(action, "OUT") == 0)
				{
					if (in_hour == -1)
					{
						printf("\033[1;31mWarning: OUT punch without matching IN.\033[0m\n");
					}
					else
					{
						total_hours += calculate_hours(in_hour, in_min, in_sec, hour, min, sec);
						in_hour = in_min = in_sec = -1;
					}
				}
			}
		}
	}

	printf("\n\033[1;33mTotal hours worked today: %.2f hours\033[0m\n", total_hours);

	fclose(file);

	export_report(username, total_hours);
}

void export_report(const char *username, double total_hours)
{
	char report_filename[100];
	snprintf(report_filename, sizeof(report_filename), REPORT_FILE_FORMAT, username);

	FILE *report = fopen(report_filename, "w");
	if (!report)
	{
		perror("Error creating report file");
		return;
	}

	fprintf(report, "Username: %s\n", username);
	fprintf(report, "Total Hours Worked Today: %.2f\n", total_hours);

	fclose(report);

	printf("\033[1;36mReport saved to %s\033[0m\n", report_filename);
}

double calculate_hours(int in_hour, int in_min, int in_sec, int out_hour, int out_min, int out_sec)
{
	int in_total_seconds = in_hour * 3600 + in_min * 60 + in_sec;
	int out_total_seconds = out_hour * 3600 + out_min * 60 + out_sec;
	int diff_seconds = out_total_seconds - in_total_seconds;

	if (diff_seconds < 0)
		return 0.0;

	return diff_seconds / 3600.0;
}

void weekly_summary(const char *username)
{
	FILE *file = fopen(LOG_FILE, "r");
	if (!file)
	{
		perror("Error opening log file");
		return;
	}

	time_t now = time(NULL);
	char line[256];

	double daily_hours[7] = {0};

	while (fgets(line, sizeof(line), file))
	{
		char file_username[50];
		char action[10];
		int day, month, year, hour, min, sec;

		if (sscanf(line, "%49s %9s - %d/%d/%d %d:%d:%d",
					file_username, action, &day, &month, &year, &hour, &min, &sec) == 8)
		{
			struct tm log_tm = {0};
			log_tm.tm_mday = day;
			log_tm.tm_mon = month - 1;
			log_tm.tm_year = year - 1900;
			log_tm.tm_hour = hour;
			log_tm.tm_min = min;
			log_tm.tm_sec = sec;

			time_t log_time = mktime(&log_tm);
			struct tm *log_day = localtime(&log_time);

			if (strcmp(file_username, username) == 0 &&
					difftime(now, log_time) <= 604800) // 7 days
			{
				int wday = log_day->tm_wday;
				static int in_hour = -1, in_min = -1, in_sec = -1;

				if (strcmp(action, "IN") == 0)
				{
					in_hour = hour;
					in_min = min;
					in_sec = sec;
				}
				else if (strcmp(action, "OUT") == 0 && in_hour != -1)
				{
					daily_hours[wday] += calculate_hours(in_hour, in_min, in_sec, hour, min, sec);
					in_hour = in_min = in_sec = -1;
				}
			}
		}
	}

	fclose(file);

	printf("\n\033[1;34mWeekly Summary for %s:\033[0m\n", username);
	const char *days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
	double total = 0.0;

	for (int i = 0; i < 7; i++)
	{
		printf("%s: %.2f hours\n", days[i], daily_hours[i]);
		total += daily_hours[i];
	}

	printf("\033[1;33mTotal hours worked this week: %.2f hours\033[0m\n", total);
}

void print_colored(const char *text, const char *color)
{
	printf("%s%s\033[0m", color, text);
}

